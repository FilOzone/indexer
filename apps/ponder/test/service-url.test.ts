import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stringToHex } from 'viem'
import { serviceUrlFromCapabilities } from '../src/utils/service-url.ts'

test('serviceUrlFromCapabilities decodes serviceURL', () => {
  assert.equal(
    serviceUrlFromCapabilities(['location', 'serviceURL'], [stringToHex('EU'), stringToHex('https://sp.example')]),
    'https://sp.example'
  )
})

test('serviceUrlFromCapabilities ignores other malformed capabilities', () => {
  assert.equal(
    serviceUrlFromCapabilities(['minPieceSizeInBytes', 'serviceURL'], ['0x', stringToHex('https://sp.example')]),
    'https://sp.example'
  )
})

test('serviceUrlFromCapabilities returns null without serviceURL', () => {
  assert.equal(serviceUrlFromCapabilities(['location'], [stringToHex('EU')]), null)
})
