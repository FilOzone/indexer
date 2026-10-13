import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasMetadataKey, WITH_CDN, withoutMetadataKey } from '../src/utils/data-set-metadata.ts'

test('hasMetadataKey checks for the key, whatever its value', () => {
  assert.equal(hasMetadataKey({ withCDN: '' }, WITH_CDN), true)
  assert.equal(hasMetadataKey({ withCDN: 'true' }, WITH_CDN), true)
  assert.equal(hasMetadataKey({ source: 'app' }, WITH_CDN), false)
  assert.equal(hasMetadataKey(null, WITH_CDN), false)
})

test('withoutMetadataKey removes the key', () => {
  assert.deepEqual(withoutMetadataKey({ withCDN: '', source: 'app' }, WITH_CDN), { source: 'app' })
})

test('withoutMetadataKey returns null when no keys are left', () => {
  assert.equal(withoutMetadataKey({ withCDN: '' }, WITH_CDN), null)
})

test('withoutMetadataKey keeps metadata without the key', () => {
  const metadata = { source: 'app' }
  assert.equal(withoutMetadataKey(metadata, WITH_CDN), metadata)
  assert.equal(withoutMetadataKey(null, WITH_CDN), null)
})
