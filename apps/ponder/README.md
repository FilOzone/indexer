
# Ponder Indexer

Indexes FWSS inventory state for datasets, pieces, and storage providers.

The schema is defined once, in `ponder.schema.ts`. `@filoz/indexer` compiles that file and re-exports its tables, so
downstream consumers can query the same tables with Drizzle without running Ponder.

After changing the schema, run `pnpm --filter @filoz/indexer schema:sql` and commit the updated
`packages/indexer/schema.sql`. Its test fails until you do. The snapshot shows the SQL diff in review and, because it
lives in the package, makes release-please release `@filoz/indexer` for the change.

## Tables

- `providers`: current ServiceProviderRegistry state, including provider name from block-scoped `eth_call`s, the PDP
  product `serviceURL`, FWSS approval status, and endorsement status from the canonical ProviderIdSet.
- `data_sets`: current FWSS dataset state, including the dataset payer and optional metadata `source`. `with_cdn` and
  `with_ipfs_indexing` are extracted from dataset metadata. `pdp_end_epoch IS NOT NULL` means PDP payment termination has
  started.
- `pieces`: current piece inventory keyed by `(data_set_id, piece_id)`, with a secondary CID index for finding alternate
  providers.

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

## Networks

| Network | Goldsky slug | FWSS address | PDPVerifier address | Start block |
| --- | --- | --- | --- | --- |
| Filecoin mainnet | `filecoin` | `0x8408502033C418E1bbC97cE9ac48E5528F371A9f` | `0xBADd0B92C1c71d02E7d520f64c0876538fa2557F` | `5459607` |
| Filecoin calibration | `filecoin-testnet` | `0x02925630df557F957f70E112bA06e50965417CA0` | `0x85e366Cf9DD2c0aE37E963d9556F5f4718d6417C` | `3141266` |

Start blocks are 10 blocks before FWSS proxy creation. Mainnet FWSS was created at block `5459617`; calibration FWSS was created at block `3141276`.
