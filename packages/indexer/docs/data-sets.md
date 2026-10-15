# Data sets and pieces

How the indexer builds the `data_sets` and `pieces` tables from FWSS and PDPVerifier events.

PDPVerifier proves storage for every data set. FWSS (FilecoinWarmStorageService) is the service contract that creates
data sets, pays for them and holds their metadata. The indexer only tracks data sets created through FWSS. This page
explains the columns that aren't plain copies of one event field. Contract references are to
[FWSS v1.4.0](https://github.com/FilOzone/filecoin-services/blob/v1.4.0/service_contracts/src/FilecoinWarmStorageService.sol)
and [PDPVerifier v3.5.0](https://github.com/FilOzone/pdp/blob/v3.5.0/src/PDPVerifier.sol), the versions deployed on
both networks.

The handlers are in [`apps/ponder/src/fwss.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/fwss.ts)
and [`apps/ponder/src/pdp-verifier.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/pdp-verifier.ts).

## Sources

| Network | FWSS | PDPVerifier | Start block |
| --- | --- | --- | --- |
| Mainnet | `0x8408502033C418E1bbC97cE9ac48E5528F371A9f` | `0xBADd0B92C1c71d02E7d520f64c0876538fa2557F` | `5459607` |
| Calibration | `0x02925630df557F957f70E112bA06e50965417CA0` | `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` | `3141266` |

The start block is 10 blocks before FWSS was deployed. PDPVerifier is older, but data sets created before FWSS aren't
FWSS data sets.

Every event the indexer reads has had the same signature in every FWSS release since v1.0.0 and every PDPVerifier
release since v2.0.0. Ponder only decodes logs that match the current ABI, so a changed signature would silently drop
older logs.

| Event | Contract | Effect |
| --- | --- | --- |
| `DataSetCreated` | FWSS | Inserts the `data_sets` row. |
| `CDNServiceTerminated` | FWSS | Sets `with_cdn` to false and removes `withCDN` from `metadata`. |
| `PDPPaymentTerminated` | FWSS | Sets `pdp_end_epoch`. |
| `PieceAdded` | FWSS | Inserts the `pieces` row. |
| `PiecesRemoved` | PDPVerifier | Marks the listed pieces removed. |
| `DataSetDeleted` | PDPVerifier | Sets `deleted`, and marks the data set's remaining pieces removed. |

## `data_sets`

### Copied from `DataSetCreated`

`data_set_id`, `provider_id` and `payer` come from `DataSetCreated` and never change. FWSS reverts
`storageProviderChanged` in every release, so a data set can't move to another provider, and
`DataSetServiceProviderChanged` has never been emitted. `created_at_block` is the event's block.

### `metadata`

The data set's metadata as a key-value object, or null when it has none. It starts as the `metadataKeys` and
`metadataValues` of `DataSetCreated`.

FWSS only changes data set metadata in two ways after creation:

- When CDN ends, `terminateCDNService` deletes the `withCDN` key. The indexer removes it too (see `with_cdn`), and the
  column becomes null if no keys are left.
- When the data set is deleted, `dataSetDeleted` deletes all of its metadata. The indexer keeps the last metadata, so
  deleted data sets still show what they were.

### `source`

The value of the `source` metadata key, or null without one. Apps set it to say which app created the data set.

### `with_cdn`

Whether the data set pays for FilBeam CDN.

- **At creation**, it's true when `metadata` has a `withCDN` key, whatever the value. That's how FWSS decides
  (`hasCDNMetadataKey`) before it creates the CDN rails.
- **`CDNServiceTerminated`** sets it to false. FWSS emits that event when the FilBeam controller ends CDN
  (`terminateCDNService`), and when a data set with CDN is deleted. In v1.0.0 and v1.1.0 it was also emitted by
  `terminateService`. From v1.3.0 the `Rails` library emits it; library functions run in FWSS's context, so the log
  still comes from the FWSS address.

`cache_miss_rail_id` and `cdn_rail_id` stay set after CDN ends. FWSS keeps them too, and the rails still exist, now
terminated. See [`rails.md`](./rails.md#data-set-rail-ids).

### `with_ipfs_indexing`

Whether `metadata` has a `withIPFSIndexing` key, whatever its value. FWSS doesn't read this key. It asks the storage
provider to index the data set for IPFS retrieval, and the convention matches `withCDN`: the key's presence is what
counts.

### `pdp_end_epoch`

The last epoch the storage rail pays for, from `PDPPaymentTerminated`. It's null until the storage payment is
terminated. FWSS emits the event from `railTerminated` when it terminates the data set's PDP rail, which happens through
`terminateService`.

FWSS v1.4.0 can also delete a data set that was never terminated, if it's been inactive long enough (`abandonRails`,
which emits `DataSetAbandoned`). Those data sets end with `deleted` true and `pdp_end_epoch` null.

### `deleted`

Set to true by PDPVerifier `DataSetDeleted`. The data set no longer exists on chain, and FWSS has deleted its metadata.

### `updated_at_block`

The block of the latest event that changed the row.

## `pieces`

Keyed by `(data_set_id, piece_id)`, with indexes on `cid` and `ipfs_root_cid`.

### `cid` and `raw_size`

FWSS `PieceAdded` carries the piece CID as raw bytes. The indexer decodes it with synapse-core's `Piece.from`: `cid` is
the PieceCID v2 string, and `raw_size` is the size of the original data, in bytes. PDPVerifier checks every CID with
`validateCommPv2` before adding it, so decoding can't fail on chain data.

### `piece_id`

The id PDPVerifier gave the piece. Ids are never reused: PDPVerifier removes a piece by clearing its root in place, and
only shrinks the list while cleaning up a deleted data set.

### `metadata`

The piece's metadata from `PieceAdded`, or null without any. FWSS deletes a piece's metadata when the piece is removed.
The indexer keeps it.

### `ipfs_root_cid`

The piece's `ipfsRootCID` metadata, normalized to a CIDv1 base32 string, with an index. It's the root CID of the IPFS
content (a UNIXFS DAG packed as a CAR) that the piece holds. Apps such as synapse-core set the key, and the storage
provider uses it to serve the content over IPFS when the data set has `withIPFSIndexing`. FWSS doesn't read it.

Normalizing means one exact match finds a root however the app spelled it:

- A CIDv0 (`Qm…`) becomes its dag-pb CIDv1 (`bafy…`).
- A CIDv1 in base58btc (`z…`) or base36 (`k…`) is rewritten in base32.
- A value that isn't a CID leaves the column null. The original value is still in `metadata`.

To look up a root, normalize it the same way (`CID.parse(cid).toV1().toString()` with `multiformats`) and match
`ipfs_root_cid`. The column is set whether or not the data set has `with_ipfs_indexing`, so add that filter when you
need a provider that serves the content over IPFS:

```sql
select p.data_set_id, p.piece_id, d.provider_id
from pieces p
join data_sets d on d.data_set_id = p.data_set_id
where p.ipfs_root_cid = $1 and not p.removed and d.with_ipfs_indexing
```

The helper is
[`apps/ponder/src/utils/ipfs-root-cid.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/utils/ipfs-root-cid.ts).

### `removed` and `removed_at_block`

A piece is removed in either of two ways:

1. **`PiecesRemoved`.** The provider schedules removals, and PDPVerifier removes them at the next proving period and
   emits `PiecesRemoved`.
2. **The data set is deleted.** PDPVerifier 3.5.0 deletes in two steps: `deleteDataSet` emits `DataSetDeleted`, then
   `cleanupPieces` removes the remaining pieces without emitting `PiecesRemoved`. The indexer marks all of that data
   set's pieces removed when it sees `DataSetDeleted`, with `removed_at_block` set to the deletion block.

So `removed = false` means the piece is still stored in a live data set. To find live copies of a CID, filter on
`removed = false`; no join on `data_sets.deleted` is needed.

## Checking against the chain

- **`getDataSet(dataSetId)`** on the FWSS state view contract returns the payer, provider and rail ids of a live
  data set. `getAllDataSetMetadata(dataSetId)` returns its current metadata, which should match `metadata`.
- **PDPVerifier `getActivePieces(setId, offset, limit)`** lists a live data set's pieces. They should match the rows
  with `removed = false`.
