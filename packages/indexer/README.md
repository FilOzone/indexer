# @filoz/indexer

Drizzle tables for the Filecoin indexer database. They are the same tables the
[Ponder indexer](https://github.com/FilOzone/indexer/tree/main/apps/ponder) writes, re-exported so other services can
query them directly.

## Install

```sh
pnpm add @filoz/indexer drizzle-orm@0.41.0
```

`drizzle-orm` must be `0.41.0`, the version Ponder pins. Add the Postgres driver you use (`pg` or `postgres`).

## Connect to the `early-repair` schema

Ponder writes each deployment to its own Postgres schema and publishes views over the latest ready deployment in the
`early-repair` schema. Query those views.

The tables in this package don't name a schema, so Postgres resolves them through the connection's `search_path`,
which defaults to `public`. Set it to `early-repair` on the connection, or queries fail with
`relation "pieces" does not exist`.

With [`pg`](https://node-postgres.com):

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=early-repair',
})
const db = drizzle(pool)
```

With [`postgres`](https://github.com/porsager/postgres):

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL, {
  connection: { search_path: 'early-repair' },
})
const db = drizzle(client)
```

With `pg`, you can also put it in the connection string:
`postgres://user:pass@host:5432/db?options=-c%20search_path%3Dearly-repair`.

## Query

```ts
import { dataSets, pieces, providers } from '@filoz/indexer'
import { and, eq } from 'drizzle-orm'

const copies = await db
  .select({ dataSetId: pieces.dataSetId, providerId: dataSets.providerId, serviceUrl: providers.serviceUrl })
  .from(pieces)
  .innerJoin(dataSets, eq(dataSets.dataSetId, pieces.dataSetId))
  .innerJoin(providers, eq(providers.providerId, dataSets.providerId))
  .where(and(eq(pieces.cid, cid), eq(pieces.removed, false)))
```

The views are read-only from a consumer's point of view. Only Ponder writes to the indexer database.

## Tables

| Export | Table | Row type |
| --- | --- | --- |
| `providers` | `providers` | `Provider` |
| `dataSets` | `data_sets` | `DataSet` |
| `pieces` | `pieces` | `Piece` |
| `rails` | `rails` | `Rail` |
| `railSettlements` | `rail_settlements` | `RailSettlement` |
| `railOneTimePayments` | `rail_one_time_payments` | `RailOneTimePayment` |
| `sessionKeyPermissions` | `session_key_permissions` | `SessionKeyPermission` |
| `sessionKeyEvents` | `session_key_events` | `SessionKeyEvent` |

[`schema.sql`](./schema.sql) lists the columns and indexes as Ponder creates them. It is generated from
`apps/ponder/ponder.schema.ts` and ships with the package.
