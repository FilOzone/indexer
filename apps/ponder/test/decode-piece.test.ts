import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as Piece from '@filoz/synapse-core/piece'
import { decodePiece } from '../src/utils/decode-piece.ts'

test('decodePiece returns the PieceCID string and raw size from contract bytes', async () => {
  const bytes = new Uint8Array(1000).fill(7)
  const piece = await Piece.calculate(bytes)

  assert.deepEqual(decodePiece({ data: piece.toHex() }), {
    cid: piece.toString(),
    rawSize: 1000n,
  })
})
