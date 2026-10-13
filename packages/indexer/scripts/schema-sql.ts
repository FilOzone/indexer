import { writeFileSync } from 'node:fs'
import * as schema from '../../../apps/ponder/ponder.schema.ts'
// Ponder doesn't export its DDL generator, so this reaches into its build output. It is the same function Ponder
// uses to create the tables, so the snapshot matches what lands in the database.
import { getSql } from '../node_modules/ponder/dist/esm/drizzle/kit/index.js'

type SqlStatements = { tables: { sql: string[] }; indexes: { sql: string[] } }

export const schemaSqlFile = new URL('../schema.sql', import.meta.url)

/** The CREATE TABLE and CREATE INDEX statements Ponder runs for ponder.schema.ts, without its `_reorg__` tables. */
export function schemaSql(): string {
  const statements = (getSql as (schema: object) => SqlStatements)(schema)
  const tables = statements.tables.sql.filter((sql) => !sql.startsWith('CREATE TABLE "_reorg__'))

  return [
    '-- Generated from apps/ponder/ponder.schema.ts by `pnpm --filter @filoz/indexer schema:sql`. Do not edit.',
    '',
    tables.map((sql) => sql.trimEnd()).join('\n\n'),
    '',
    ...statements.indexes.sql,
    '',
  ].join('\n')
}

if (import.meta.main) {
  writeFileSync(schemaSqlFile, schemaSql())
}
