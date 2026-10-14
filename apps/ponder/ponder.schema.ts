// The single schema definition. `@filoz/indexer` compiles and re-exports these tables for Drizzle consumers.
import { index, onchainTable, primaryKey } from 'ponder'

export type JsonRecord = Record<string, string>

export const providers = onchainTable(
  'providers',
  (t) => ({
    providerId: t.int8({ mode: 'bigint' }).primaryKey(),
    providerAddress: t.text(),
    name: t.text(),
    serviceUrl: t.text(),
    providerActive: t.boolean().notNull(),
    pdpProductActive: t.boolean().notNull(),
    approved: t.boolean().notNull().default(false),
    endorsed: t.boolean().notNull().default(false),
    createdAtBlock: t.int8({ mode: 'bigint' }),
    updatedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
  }),
  (table) => ({
    providerAddressIdx: index().on(table.providerAddress),
  })
)

export const dataSets = onchainTable(
  'data_sets',
  (t) => ({
    dataSetId: t.int8({ mode: 'bigint' }).primaryKey(),
    providerId: t.int8({ mode: 'bigint' }).notNull(),
    payer: t.text().notNull(),
    source: t.text(),
    metadata: t.jsonb().$type<JsonRecord | null>(),
    withCdn: t.boolean().notNull(),
    withIpfsIndexing: t.boolean().notNull(),
    pdpEndEpoch: t.int8({ mode: 'bigint' }),
    pdpRailId: t.int8({ mode: 'bigint' }).notNull(),
    cacheMissRailId: t.int8({ mode: 'bigint' }),
    cdnRailId: t.int8({ mode: 'bigint' }),
    deleted: t.boolean().notNull(),
    createdAtBlock: t.int8({ mode: 'bigint' }).notNull(),
    updatedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
  }),
  (table) => ({
    providerIdIdx: index().on(table.providerId),
    payerDataSetIdIdx: index().on(table.payer, table.dataSetId),
    pdpRailIdIdx: index().on(table.pdpRailId),
    cacheMissRailIdIdx: index().on(table.cacheMissRailId),
    cdnRailIdIdx: index().on(table.cdnRailId),
  })
)

export const pieces = onchainTable(
  'pieces',
  (t) => ({
    dataSetId: t.int8({ mode: 'bigint' }).notNull(),
    pieceId: t.int8({ mode: 'bigint' }).notNull(),
    cid: t.text().notNull(),
    rawSize: t.int8({ mode: 'bigint' }).notNull(),
    metadata: t.jsonb().$type<JsonRecord | null>(),
    // `ipfsRootCID` metadata normalized to CIDv1 base32; null when missing or not a CID.
    ipfsRootCid: t.text(),
    removed: t.boolean().notNull(),
    addedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
    removedAtBlock: t.int8({ mode: 'bigint' }),
    updatedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.dataSetId, table.pieceId] }),
    cidIdx: index().on(table.cid),
    ipfsRootCidIdx: index().on(table.ipfsRootCid),
  })
)

export const sessionKeyPermissions = onchainTable(
  'session_key_permissions',
  (t) => ({
    identity: t.text().notNull(),
    signer: t.text().notNull(),
    permission: t.hex().notNull(),
    expiry: t.bigint().notNull(),
    origin: t.text().notNull(),
    updatedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.identity, table.signer, table.permission] }),
    signerIdx: index().on(table.signer),
  })
)

export const sessionKeyEvents = onchainTable(
  'session_key_events',
  (t) => ({
    blockNumber: t.int8({ mode: 'bigint' }).notNull(),
    logIndex: t.integer().notNull(),
    identity: t.text().notNull(),
    signer: t.text().notNull(),
    expiry: t.bigint().notNull(),
    permissions: t.hex().array().notNull(),
    origin: t.text().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.blockNumber, table.logIndex] }),
    identityIdx: index().on(table.identity),
    signerIdx: index().on(table.signer),
  })
)

export const rails = onchainTable(
  'rails',
  (t) => ({
    railId: t.int8({ mode: 'bigint' }).primaryKey(),
    payer: t.text().notNull(),
    payee: t.text().notNull(),
    token: t.text().notNull(),
    operator: t.text().notNull(),
    validator: t.text().notNull(),
    serviceFeeRecipient: t.text().notNull(),
    commissionRateBps: t.bigint().notNull(),
    paymentRate: t.bigint().notNull().default(0n),
    lockupPeriod: t.bigint().notNull().default(0n),
    lockupFixed: t.bigint().notNull().default(0n),
    endEpoch: t.int8({ mode: 'bigint' }),
    terminatedBy: t.text(),
    finalized: t.boolean().notNull().default(false),
    settledUpTo: t.int8({ mode: 'bigint' }).notNull(),
    // Epoch of the newest entry in the contract's rate change queue; the queue is empty once settledUpTo reaches it.
    rateChangeQueueUntil: t.int8({ mode: 'bigint' }),
    totalSettledAmount: t.bigint().notNull().default(0n),
    totalNetPayeeAmount: t.bigint().notNull().default(0n),
    totalOperatorCommission: t.bigint().notNull().default(0n),
    totalNetworkFee: t.bigint().notNull().default(0n),
    totalOneTimeAmount: t.bigint().notNull().default(0n),
    totalOneTimeNetPayeeAmount: t.bigint().notNull().default(0n),
    createdAtBlock: t.int8({ mode: 'bigint' }).notNull(),
    updatedAtBlock: t.int8({ mode: 'bigint' }).notNull(),
  }),
  (table) => ({
    payerRailIdIdx: index().on(table.payer, table.railId),
    payeeRailIdIdx: index().on(table.payee, table.railId),
    operatorRailIdIdx: index().on(table.operator, table.railId),
  })
)

export const railSettlements = onchainTable(
  'rail_settlements',
  (t) => ({
    blockNumber: t.int8({ mode: 'bigint' }).notNull(),
    logIndex: t.integer().notNull(),
    railId: t.int8({ mode: 'bigint' }).notNull(),
    totalSettledAmount: t.bigint().notNull(),
    totalNetPayeeAmount: t.bigint().notNull(),
    operatorCommission: t.bigint().notNull(),
    networkFee: t.bigint().notNull(),
    settledUpTo: t.int8({ mode: 'bigint' }).notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    // Always read one rail at a time, newest first.
    pk: primaryKey({ columns: [table.railId, table.blockNumber, table.logIndex] }),
  })
)

export const railOneTimePayments = onchainTable(
  'rail_one_time_payments',
  (t) => ({
    blockNumber: t.int8({ mode: 'bigint' }).notNull(),
    logIndex: t.integer().notNull(),
    railId: t.int8({ mode: 'bigint' }).notNull(),
    amount: t.bigint().notNull(),
    netPayeeAmount: t.bigint().notNull(),
    operatorCommission: t.bigint().notNull(),
    networkFee: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    // Always read one rail at a time, newest first.
    pk: primaryKey({ columns: [table.railId, table.blockNumber, table.logIndex] }),
  })
)
