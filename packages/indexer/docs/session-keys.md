# Session keys

How the indexer builds the `session_key_permissions` and `session_key_events` tables from SessionKeyRegistry events.

A session key is a signer that an identity (a wallet) authorizes to sign some operations for it until an expiry.
`session_key_events` keeps every authorization change. `session_key_permissions` keeps the current expiry of each
permission. Contract references are to
[`SessionKeyRegistry.sol`](https://github.com/FilOzone/SessionKeyRegistry/blob/main/src/SessionKeyRegistry.sol).

The handler is in [`apps/ponder/src/session-key-registry.ts`](https://github.com/FilOzone/indexer/blob/main/apps/ponder/src/session-key-registry.ts).

## Source

The indexer reads SessionKeyRegistry from its deployment block:

| Network | SessionKeyRegistry | Start block |
| --- | --- | --- |
| Mainnet | `0x74FD50525A958aF5d484601E252271f9625231aB` | `5459604` |
| Calibration | `0x518411c2062E119Aaf7A8B12A2eDf9a939347655` | `3185523` |

The contract has a single event:

```solidity
event AuthorizationsUpdated(
    address indexed identity, address signer, uint256 expiry, bytes32[] permissions, string origin
);
```

`login`, `loginAndFund` and `revoke` all emit it from `_setAuthorizations`. That function sets
`authorizationExpiry[identity][signer][permission] = expiry` for every permission in the call. `revoke` passes an
expiry of 0.

## `session_key_events`

One row per `AuthorizationsUpdated` event, keyed by `(block_number, log_index)` and indexed by `identity` and by
`signer`. Most columns are copied from the event:

| Column | Notes |
| --- | --- |
| `identity` | The account that called `login`, `loginAndFund` or `revoke`. |
| `signer` | The session key. |
| `expiry` | Unix timestamp in seconds; 0 for a revoke. |
| `permissions` | `text[]` of the permission typehashes (`bytes32`), lowercase `0x` hex. |
| `origin` | The app that asked for the change, as the caller passed it. It can be an empty string. |
| `tx_hash` | The transaction that emitted the event. |

Sort history newest first with `order by block_number desc, log_index desc`, which the primary key covers. There's no
timestamp column; derive the time from `block_number` (see [Block times](../README.md#block-times)).

## `session_key_permissions`

The current expiry of each permission, keyed by `(identity, signer, permission)` and indexed by `signer`. Each
`AuthorizationsUpdated` event inserts or updates one row for every permission it lists:

| Column | Value |
| --- | --- |
| `expiry` | The event's `expiry`. |
| `origin` | The event's `origin`. |
| `updated_at_block` | The event's block. |

To find the transaction that last changed a permission, look up its event in `session_key_events`:

```sql
select tx_hash from session_key_events
where identity = $1 and signer = $2 and block_number = $3 and $4 = any(permissions)
order by log_index desc
limit 1
```

with `$3` the row's `updated_at_block` and `$4` its `permission`.

Ponder processes events in block and log order, so each row ends up with the latest event that named that permission.
That's what `authorizationExpiry(identity, signer, permission)` returns on chain, because each call overwrites the
expiry of exactly the permissions it lists. Permissions the event doesn't list keep their earlier rows.

A revoked permission keeps its row, with `expiry` 0. The table never deletes rows.

### Active permissions

FWSS accepts a session key's signature while `authorizationExpiry(payer, signer, typehash) >= block.timestamp`. So a
permission is active while `expiry >= now`, with `now` in seconds. A session key is active while any of its
permissions is.

```sql
select identity, signer, max(expiry) as expiry
from session_key_permissions
group by identity, signer
having max(expiry) >= extract(epoch from now())
```

`permission` is a typehash, not a name. Map known typehashes to names in the app: synapse-core's
[`session-key/permissions.ts`](https://github.com/FilOzone/synapse-sdk/blob/master/packages/synapse-core/src/session-key/permissions.ts)
lists the current ones, and older synapse-core releases used other typehashes that still appear in onchain
authorizations.

## Checking against the chain

For any row, `authorizationExpiry(identity, signer, permission)` on SessionKeyRegistry should return `expiry` at the
same block.
