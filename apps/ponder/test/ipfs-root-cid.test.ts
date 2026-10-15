import assert from 'node:assert/strict'
import { test } from 'node:test'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { normalizeIpfsRootCid } from '../src/utils/ipfs-root-cid.ts'

const v0 = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'
const v1 = CID.parse(v0).toV1()

test('normalizeIpfsRootCid converts CIDv0 to CIDv1 base32', () => {
  assert.equal(normalizeIpfsRootCid(v0), v1.toString())
  assert.match(v1.toString(), /^bafy/)
})

test('normalizeIpfsRootCid keeps CIDv1 base32', () => {
  assert.equal(normalizeIpfsRootCid(v1.toString()), v1.toString())
})

test('normalizeIpfsRootCid converts other CIDv1 bases to base32', () => {
  assert.equal(normalizeIpfsRootCid(v1.toString(base58btc)), v1.toString())
  assert.equal(normalizeIpfsRootCid(v1.toString(base36)), v1.toString())
})

test('normalizeIpfsRootCid trims whitespace', () => {
  assert.equal(normalizeIpfsRootCid(` ${v0}\n`), v1.toString())
})

test('normalizeIpfsRootCid returns null for missing or invalid values', () => {
  assert.equal(normalizeIpfsRootCid(undefined), null)
  assert.equal(normalizeIpfsRootCid(''), null)
  assert.equal(normalizeIpfsRootCid('not-a-cid'), null)
})
