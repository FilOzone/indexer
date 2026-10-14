
# Ponder Indexer

Indexes FWSS inventory state for datasets, pieces, and storage providers, FilecoinPay payment rails, and
SessionKeyRegistry session keys.

The schema is defined once, in `ponder.schema.ts`. `@filoz/indexer` compiles that file and re-exports its tables, so
downstream consumers can query the same tables with Drizzle without running Ponder.

After changing the schema, run `pnpm --filter @filoz/indexer schema:sql` and commit the updated
`packages/indexer/schema.sql`. Its test fails until you do. The snapshot shows the SQL diff in review and, because it
lives in the package, makes release-please release `@filoz/indexer` for the change.

## Tables

- `providers`: current ServiceProviderRegistry state, including provider name from block-scoped `eth_call`s, the PDP
  product `serviceURL`, FWSS approval status, and endorsement status from the canonical ProviderIdSet. `ProviderRemoved`
  also clears `pdp_product_active`, because the registry deactivates the product without `ProductRemoved`.
- `data_sets`: current FWSS dataset state, including the dataset payer and optional metadata `source`. `with_cdn` and
  `with_ipfs_indexing` are true when the metadata has the `withCDN` or `withIPFSIndexing` key, whatever its value, as FWSS
  checks; `CDNServiceTerminated` clears `with_cdn` and removes the key. `pdp_end_epoch IS NOT NULL` means PDP payment
  termination has started. `pdp_rail_id`, `cache_miss_rail_id` and `cdn_rail_id` link to `rails`; the CDN ones are null without CDN.
- `pieces`: current piece inventory keyed by `(data_set_id, piece_id)`, with a secondary CID index for finding alternate
  providers. `ipfs_root_cid` holds the `ipfsRootCID` metadata normalized to CIDv1 base32, indexed for IPFS retrieval
  lookups. Deleting a data set marks its remaining pieces removed, because PDPVerifier cleans them up without
  `PiecesRemoved`.
- `rails`: current FilecoinPay rail state for every operator, folded from rail events: the latest rate and lockup,
  termination and finalization, and running settlement and one-time payment totals. Indexed by payer, payee and
  operator.
  - One-time payments reduce `lockup_fixed` without a `RailLockupModified` event, so `RailOneTimePaymentProcessed`
    subtracts them.
  - `settled_up_to` starts at the creation block, and moves to the current block when a rate leaves 0 with an empty
    rate change queue, as `enqueueRateChange` does on chain. `rate_change_queue_until` tracks the newest queue entry
    for that. Every `RailSettled` resets `settled_up_to` to the on-chain value.
  - FilecoinPay zeroes a rail on finalization; the row keeps its last terms and sets `finalized`.
- `rail_settlements`: every `RailSettled` event, keyed by `(rail_id, block_number, log_index)`.
- `rail_one_time_payments`: every `RailOneTimePaymentProcessed` event, with `amount` as the sum of the net payee
  amount, operator commission and network fee. Keyed by `(rail_id, block_number, log_index)`.
- `session_key_permissions`: current expiry of each session key permission, keyed by `(identity, signer, permission)`
  and folded from SessionKeyRegistry `AuthorizationsUpdated` events. A revoked permission has `expiry` 0.
- `session_key_events`: every `AuthorizationsUpdated` event, keyed by `(block_number, log_index)`.

[`packages/indexer/docs`](../../packages/indexer/docs) documents every calculated column in detail, with the contract code
each rule follows: [data sets and pieces](../../packages/indexer/docs/data-sets.md),
[providers](../../packages/indexer/docs/providers.md), [rails](../../packages/indexer/docs/rails.md) and
[session keys](../../packages/indexer/docs/session-keys.md).

## Commands

```sh
pnpm turbo run typecheck --filter=@filoz/indexer-ponder
pnpm run dev:mainnet
pnpm run dev:calibnet
```

Set `DATABASE_URL` and `RPC_URL` to override the local defaults.

Environment variables:

| Variable | Values | Default | Strict mode |
| --- | --- | --- | --- |
| `PONDER_NETWORK` | `mainnet`, `calibnet` | `mainnet` | Required |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://ponder:ponder@localhost:17825/ponder` | Required |
| `RPC_URL` | Filecoin JSON-RPC URL | `http://localhost:1234/rpc/v1` | Required |
| `PONDER_STRICT_ENV` | `true`, `1` | unset | Enables strict mode |

Set `PONDER_STRICT_ENV=true` to require `PONDER_NETWORK`, `DATABASE_URL`, and `RPC_URL`, which is recommended for
deployments.

Production deployments write to their own `DATABASE_SCHEMA` and run with `--views-schema early-repair` (or
`DATABASE_VIEWS_SCHEMA=early-repair`). Once a deployment finishes its backfill, Ponder points the views in
`early-repair` at its tables. `@filoz/indexer` consumers query those views, so keep that name stable.

## Networks

| Network | Goldsky slug | FWSS address | PDPVerifier address | Start block |
| --- | --- | --- | --- | --- |
| Filecoin mainnet | `filecoin` | `0x8408502033C418E1bbC97cE9ac48E5528F371A9f` | `0xBADd0B92C1c71d02E7d520f64c0876538fa2557F` | `5459607` |
| Filecoin calibration | `filecoin-testnet` | `0x02925630df557F957f70E112bA06e50965417CA0` | `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` | `3141266` |

Start blocks are 10 blocks before FWSS proxy creation. Mainnet FWSS was created at block `5459617`; calibration FWSS was created at block `3141276`.
FilecoinPay was deployed before FWSS, so it is indexed from its deployment block: `5421337` on mainnet
(`0x23b1e018F08BB982348b15a86ee926eEBf7F4DAa`) and `3120649` on calibration (`0x09a0fDc2723fAd1A7b8e3e00eE5DF73841df55a0`).
SessionKeyRegistry is also indexed from its deployment block: `5459604` on mainnet (`0x74FD50525A958aF5d484601E252271f9625231aB`)
and `3185523` on calibration (`0x518411c2062E119Aaf7A8B12A2eDf9a939347655`).
