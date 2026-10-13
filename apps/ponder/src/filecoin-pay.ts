import { ponder } from 'ponder:registry'
import { railSettlements, rails } from 'ponder:schema'

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
    createdAtBlock: event.block.number,
    createdAt: event.block.timestamp,
    txHash: event.transaction.hash,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FilecoinPay:RailRateModified', async ({ event, context }) => {
  const { railId, newRate } = event.args
  const existing = await context.db.find(rails, { railId })
  if (!existing) return

  await context.db.update(rails, { railId }).set({
    paymentRate: newRate,
    updatedAtBlock: event.block.number,
  })
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
    settledUpTo: row.settledUpTo === null || settledUpTo > row.settledUpTo ? settledUpTo : row.settledUpTo,
    totalSettledAmount: row.totalSettledAmount + totalSettledAmount,
    totalNetPayeeAmount: row.totalNetPayeeAmount + totalNetPayeeAmount,
    totalOperatorCommission: row.totalOperatorCommission + operatorCommission,
    totalNetworkFee: row.totalNetworkFee + networkFee,
    updatedAtBlock: event.block.number,
  }))
})
