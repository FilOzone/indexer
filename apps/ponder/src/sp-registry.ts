import type { Context, Event } from 'ponder:registry'
import { ponder } from 'ponder:registry'
import { providers } from 'ponder:schema'
import { serviceProviderRegistry } from '@filoz/synapse-core/abis'
import { PRODUCTS } from '@filoz/synapse-core/sp-registry'
import type { Address, Hex } from 'viem'
import { serviceUrlFromCapabilities } from './utils/service-url.ts'

interface ProviderInfo {
  providerAddress: Address | null
  name: string | null
  providerActive: boolean
}

type SpRegistryContext = Pick<Context<'SPRegistry:ProviderRegistered'>, 'client' | 'db'>
type SpRegistryEvent = Pick<Event<'SPRegistry:ProviderRegistered'>, 'block' | 'log'>

async function readProviderInfo(
  context: Pick<SpRegistryContext, 'client'>,
  registryAddress: Address,
  providerId: bigint,
  blockNumber: bigint
): Promise<ProviderInfo> {
  const result = await context.client.readContract({
    abi: serviceProviderRegistry,
    address: registryAddress,
    functionName: 'providers',
    args: [providerId],
    blockNumber,
  })

  const [providerAddress, , name, , providerActive] = result

  return { providerAddress, name, providerActive }
}

async function upsertProviderInfo({
  context,
  event,
  providerId,
  providerAddress,
}: {
  context: SpRegistryContext
  event: SpRegistryEvent
  providerId: bigint
  providerAddress?: Address
}) {
  let info: ProviderInfo
  try {
    info = await readProviderInfo(context, event.log.address, providerId, event.block.number)
  } catch {
    // Keep what we already have rather than overwrite it with nulls. A new provider still gets a row from the event
    // payload, which is enough for address-level repair inventory.
    const existing = await context.db.find(providers, { providerId })
    if (existing) return
    info = { providerAddress: providerAddress ?? null, name: null, providerActive: true }
  }

  await context.db
    .insert(providers)
    .values({
      providerId,
      providerAddress: info.providerAddress,
      name: info.name,
      serviceUrl: null,
      providerActive: info.providerActive,
      pdpProductActive: false,
      approved: false,
      endorsed: false,
      createdAtBlock: event.block.number,
      updatedAtBlock: event.block.number,
    })
    .onConflictDoUpdate({
      providerAddress: info.providerAddress,
      name: info.name,
      providerActive: info.providerActive,
      updatedAtBlock: event.block.number,
    })
}

async function upsertPdpProduct({
  context,
  event,
  providerId,
  productType,
  serviceProvider,
  capabilityKeys,
  capabilityValues,
}: {
  context: SpRegistryContext
  event: SpRegistryEvent
  providerId: bigint
  productType: number
  serviceProvider: Address
  capabilityKeys: readonly string[]
  capabilityValues: readonly Hex[]
}) {
  if (productType !== PRODUCTS.PDP) return

  const serviceUrl = serviceUrlFromCapabilities(capabilityKeys, capabilityValues)

  await context.db
    .insert(providers)
    .values({
      providerId,
      providerAddress: serviceProvider,
      name: null,
      serviceUrl,
      providerActive: true,
      pdpProductActive: true,
      approved: false,
      endorsed: false,
      createdAtBlock: event.block.number,
      updatedAtBlock: event.block.number,
    })
    .onConflictDoUpdate({
      providerAddress: serviceProvider,
      serviceUrl,
      pdpProductActive: true,
      updatedAtBlock: event.block.number,
    })
}

ponder.on('SPRegistry:ProviderRegistered', async ({ event, context }) => {
  const { providerId, serviceProvider } = event.args

  await upsertProviderInfo({ context, event, providerId, providerAddress: serviceProvider })
})

ponder.on('SPRegistry:ProviderInfoUpdated', async ({ event, context }) => {
  const { providerId } = event.args
  await upsertProviderInfo({ context, event, providerId })
})

ponder.on('SPRegistry:ProductAdded', async ({ event, context }) => {
  await upsertPdpProduct({ context, event, ...event.args })
})

ponder.on('SPRegistry:ProductUpdated', async ({ event, context }) => {
  await upsertPdpProduct({ context, event, ...event.args })
})

ponder.on('SPRegistry:ProductRemoved', async ({ event, context }) => {
  const { providerId, productType } = event.args
  if (productType !== PRODUCTS.PDP) return

  const existing = await context.db.find(providers, { providerId })
  if (!existing) return

  await context.db.update(providers, { providerId }).set({
    pdpProductActive: false,
    updatedAtBlock: event.block.number,
  })
})

// Removing a provider also deactivates its PDP product, without a `ProductRemoved` event.
ponder.on('SPRegistry:ProviderRemoved', async ({ event, context }) => {
  const { providerId } = event.args
  const existing = await context.db.find(providers, { providerId })
  if (!existing) return

  await context.db.update(providers, { providerId }).set({
    providerActive: false,
    pdpProductActive: false,
    updatedAtBlock: event.block.number,
  })
})
