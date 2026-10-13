import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enqueueRateChange } from '../src/utils/enqueue-rate-change.ts'

test('enqueueRateChange ignores unchanged rates', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 10n, rateChangeQueueUntil: null }, 5n, 5n, 20n), {})
})

test('enqueueRateChange ignores rails settled up to the current block', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 20n, rateChangeQueueUntil: null }, 0n, 5n, 20n), {})
})

test('enqueueRateChange advances settledUpTo when a rate leaves 0 with an empty queue', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 10n, rateChangeQueueUntil: null }, 0n, 5n, 20n), {
    settledUpTo: 20n,
    rateChangeQueueUntil: null,
  })
})

test('enqueueRateChange treats a queue settled past its newest entry as empty', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 15n, rateChangeQueueUntil: 15n }, 0n, 5n, 20n), {
    settledUpTo: 20n,
    rateChangeQueueUntil: null,
  })
})

test('enqueueRateChange queues when a rate leaves 0 with pending entries', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 10n, rateChangeQueueUntil: 15n }, 0n, 5n, 20n), {
    rateChangeQueueUntil: 20n,
  })
})

test('enqueueRateChange queues changes from a non-zero rate', () => {
  assert.deepEqual(enqueueRateChange({ settledUpTo: 10n, rateChangeQueueUntil: null }, 5n, 0n, 20n), {
    rateChangeQueueUntil: 20n,
  })
})
