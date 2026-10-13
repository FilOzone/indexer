import assert from 'node:assert/strict'
import { test } from 'node:test'
import { metadataFromEntries } from '../src/utils/metadata-from-entries.ts'

test('metadataFromEntries returns null for empty metadata', () => {
  assert.equal(metadataFromEntries([], []), null)
})

test('metadataFromEntries maps keys to values', () => {
  assert.deepEqual(metadataFromEntries(['withCDN', 'source'], ['', 'app']), { withCDN: '', source: 'app' })
})
