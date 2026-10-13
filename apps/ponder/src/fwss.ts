import { ponder } from 'ponder:registry'
import { dataSets, pieces, providers } from 'ponder:schema'
import { hasMetadataKey, WITH_CDN, WITH_IPFS_INDEXING, withoutMetadataKey } from './utils/data-set-metadata.ts'
import { decodePiece } from './utils/decode-piece.ts'
import { metadataFromEntries } from './utils/metadata-from-entries.ts'

ponder.on('FWSS:DataSetCreated', async ({ event, context }) => {
  const { dataSetId, providerId, pdpRailId, cacheMissRailId, cdnRailId, payer, metadataKeys, metadataValues } =
    event.args
  const metadata = metadataFromEntries(metadataKeys, metadataValues)
  const source = metadata?.source ?? null
  const withCdn = hasMetadataKey(metadata, WITH_CDN)
  const withIpfsIndexing = hasMetadataKey(metadata, WITH_IPFS_INDEXING)
  // Rail ids are 0 when the data set has no CDN.
  const railIds = {
    pdpRailId,
    cacheMissRailId: cacheMissRailId === 0n ? null : cacheMissRailId,
    cdnRailId: cdnRailId === 0n ? null : cdnRailId,
  }

  await context.db
    .insert(dataSets)
    .values({
      dataSetId,
      providerId,
      payer,
      source,
      metadata,
      withCdn,
      withIpfsIndexing,
      pdpEndEpoch: null,
      ...railIds,
      deleted: false,
      createdAtBlock: event.block.number,
      updatedAtBlock: event.block.number,
    })
    .onConflictDoUpdate({
      providerId,
      payer,
      source,
      metadata,
      withCdn,
      withIpfsIndexing,
      ...railIds,
      deleted: false,
      updatedAtBlock: event.block.number,
    })
})

// FWSS deletes the `withCDN` metadata key when CDN ends, whether the FilBeam controller terminates it or the data set
// is deleted. The CDN rail ids stay on the data set.
ponder.on('FWSS:CDNServiceTerminated', async ({ event, context }) => {
  const { dataSetId } = event.args
  const existing = await context.db.find(dataSets, { dataSetId })
  if (!existing) return

  await context.db.update(dataSets, { dataSetId }).set({
    metadata: withoutMetadataKey(existing.metadata, WITH_CDN),
    withCdn: false,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FWSS:PieceAdded', async ({ event, context }) => {
  const { dataSetId, pieceId, pieceCid: pieceCidRaw, keys, values } = event.args

  const decoded = decodePiece(pieceCidRaw)
  const metadata = metadataFromEntries(keys, values)

  await context.db
    .insert(pieces)
    .values({
      dataSetId,
      pieceId,
      cid: decoded.cid,
      rawSize: decoded.rawSize,
      metadata,
      removed: false,
      addedAtBlock: event.block.number,
      removedAtBlock: null,
      updatedAtBlock: event.block.number,
    })
    .onConflictDoUpdate({
      cid: decoded.cid,
      rawSize: decoded.rawSize,
      metadata,
      removed: false,
      removedAtBlock: null,
      updatedAtBlock: event.block.number,
    })
})

ponder.on('FWSS:PDPPaymentTerminated', async ({ event, context }) => {
  const { dataSetId, endEpoch } = event.args
  const existing = await context.db.find(dataSets, { dataSetId })
  if (!existing) return

  await context.db.update(dataSets, { dataSetId }).set({
    pdpEndEpoch: endEpoch,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FWSS:ProviderApproved', async ({ event, context }) => {
  const { providerId } = event.args
  const existing = await context.db.find(providers, { providerId })
  if (!existing) return

  await context.db.update(providers, { providerId }).set({
    approved: true,
    updatedAtBlock: event.block.number,
  })
})

ponder.on('FWSS:ProviderUnapproved', async ({ event, context }) => {
  const { providerId } = event.args
  const existing = await context.db.find(providers, { providerId })
  if (!existing) return

  await context.db.update(providers, { providerId }).set({
    approved: false,
    updatedAtBlock: event.block.number,
  })
})
