import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { schemaSql, schemaSqlFile } from '../scripts/schema-sql.ts'

test('schema.sql matches ponder.schema.ts', () => {
  assert.equal(
    readFileSync(schemaSqlFile, 'utf8'),
    schemaSql(),
    'schema.sql is out of date: run `pnpm --filter @filoz/indexer schema:sql` and commit the result'
  )
})
