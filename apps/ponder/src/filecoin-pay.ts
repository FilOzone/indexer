import { ponder } from 'ponder:registry'
import { railOneTimePayments, railSettlements, rails } from 'ponder:schema'
import { enqueueRateChange } from './utils/enqueue-rate-change.ts'

ponder.on('FilecoinPay:RailCreated', async ({ event, context }) => {
  const { railId, payer, payee, token, operator, validator, serviceFeeRecipient, commissionRateBps } = event.args

  await context.db.insert(rails).values({
    railId,
    payer,
    payee,
    token,
    operator,
    validator,
    serviceFeeRecipient,
    commissionRateBps,
    settledUpTo: event.block.number,
    createdAtBlock: event.block.number,
    createdAt: event.block.timestamp,
    txHash: event.transaction.hash,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FilecoinPay:RailRateModified', async ({ event, context }) => {
  const { railId, oldRate, newRate } = event.args
  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set((row) => ({
    paymentRate: newRate,
    ...enqueueRateChange(row, oldRate, newRate, event.block.number),
    updatedAtBlock: event.block.number,
  }))
})

ponder.on('FilecoinPay:RailLockupModified', async ({ event, context }) => {
  const { railId, newLockupPeriod, newLockupFixed } = event.args
  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set({
    lockupPeriod: newLockupPeriod,
    lockupFixed: newLockupFixed,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FilecoinPay:RailTerminated', async ({ event, context }) => {
  const { railId, by, endEpoch } = event.args
  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set({
    endEpoch,
    terminatedBy: by,
    updatedAtBlock: event.block.number,
  })
})

// FilecoinPay zeroes a finalized rail on chain. Keep its last terms; `finalized` says nothing is locked or flowing.
ponder.on('FilecoinPay:RailFinalized', async ({ event, context }) => {
  const { railId } = event.args
  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set({
    finalized: true,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FilecoinPay:RailSettled', async ({ event, context }) => {
  const { railId, totalSettledAmount, totalNetPayeeAmount, operatorCommission, networkFee, settledUpTo } = event.args

  await context.db.insert(railSettlements).values({
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    railId,
    totalSettledAmount,
    totalNetPayeeAmount,
    operatorCommission,
    networkFee,
    settledUpTo,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  })

  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set((row) => ({
    settledUpTo,
    totalSettledAmount: row.totalSettledAmount + totalSettledAmount,
    totalNetPayeeAmount: row.totalNetPayeeAmount + totalNetPayeeAmount,
    totalOperatorCommission: row.totalOperatorCommission + operatorCommission,
    totalNetworkFee: row.totalNetworkFee + networkFee,
    updatedAtBlock: event.block.number,
  }))
})

// One-time payments come out of the rail's fixed lockup without a `RailLockupModified` event.
ponder.on('FilecoinPay:RailOneTimePaymentProcessed', async ({ event, context }) => {
  const { railId, netPayeeAmount, operatorCommission, networkFee } = event.args
  const amount = netPayeeAmount + operatorCommission + networkFee

  await context.db.insert(railOneTimePayments).values({
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    railId,
    amount,
    netPayeeAmount,
    operatorCommission,
    networkFee,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  })

  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set((row) => ({
    lockupFixed: row.lockupFixed - amount,
    totalOneTimeAmount: row.totalOneTimeAmount + amount,
    totalOneTimeNetPayeeAmount: row.totalOneTimeNetPayeeAmount + netPayeeAmount,
    updatedAtBlock: event.block.number,
  }))
})
