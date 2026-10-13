/**
 * Mirror FilecoinPay's `enqueueRateChange`, which advances `settledUpTo` without a `RailSettled` event when a rate
 * leaves 0 with an empty queue. Each `RailSettled` resets `settledUpTo` to the on-chain value.
 */
export function enqueueRateChange(
  row: { settledUpTo: bigint; rateChangeQueueUntil: bigint | null },
  oldRate: bigint,
  newRate: bigint,
  blockNumber: bigint
) {
  if (newRate === oldRate || row.settledUpTo === blockNumber) return {}
  const queueEmpty = row.rateChangeQueueUntil === null || row.settledUpTo >= row.rateChangeQueueUntil
  if (oldRate === 0n && queueEmpty) return { settledUpTo: blockNumber, rateChangeQueueUntil: null }
  return { rateChangeQueueUntil: blockNumber }
}
