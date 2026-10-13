import type { Context } from 'ponder:registry'
import { ponder } from 'ponder:registry'
import { providers } from 'ponder:schema'
import { getChain } from '@filoz/synapse-core/chains'
import { getEndorsedProviderIdsCall, parseGetEndorsedProviderIds } from '@filoz/synapse-core/endorsements'
import { and, eq, inArray, notInArray } from 'ponder'

type ProviderStatusContext = Pick<Context<'ProviderStatusSync:block'>, 'chain' | 'client' | 'db'>

async function syncEndorsements(context: ProviderStatusContext, blockNumber: bigint) {
  const call = getEndorsedProviderIdsCall({ chain: getChain(context.chain.id) })

  let endorsedProviderIds: bigint[]
  try {
    endorsedProviderIds = parseGetEndorsedProviderIds(await context.client.readContract({ ...call, blockNumber }))
  } catch (error) {
    // The endorsement set was deployed after FWSS. Historical syncs before that block can safely skip it.
    console.warn('Failed to read endorsement provider IDs; skipping endorsement sync for block', {
      address: call.address,
      blockNumber: blockNumber.toString(),
      chainId: context.chain.id,
      error,
    })
    return
  }

  if (endorsedProviderIds.length === 0) {
    await context.db.sql
      .update(providers)
      .set({
        endorsed: false,
        updatedAtBlock: blockNumber,
      })
      .where(eq(providers.endorsed, true))
  } else {
    await context.db.sql
      .update(providers)
      .set({
        endorsed: false,
        updatedAtBlock: blockNumber,
      })
      .where(and(eq(providers.endorsed, true), notInArray(providers.providerId, endorsedProviderIds)))
  }

  if (endorsedProviderIds.length > 0) {
    await context.db.sql
      .update(providers)
      .set({
        endorsed: true,
        updatedAtBlock: blockNumber,
      })
      .where(and(eq(providers.endorsed, false), inArray(providers.providerId, endorsedProviderIds)))
  }
}

ponder.on('ProviderStatusSync:block', async ({ event, context }) => {
  await syncEndorsements(context, event.block.number)
})
