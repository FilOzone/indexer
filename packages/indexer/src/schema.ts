import { bigint, boolean, index, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
import { tableNames } from './table-names.ts'

export type JsonRecord = Record<string, string>

export const providers = pgTable(
  tableNames.providers,
  {
    providerId: bigint('provider_id', { mode: 'bigint' }).primaryKey(),
    providerAddress: text('provider_address'),
    name: text('name'),
    serviceUrl: text('service_url'),
    providerActive: boolean('provider_active').notNull(),
    pdpProductActive: boolean('pdp_product_active').notNull(),
    approved: boolean('approved').notNull().default(false),
    endorsed: boolean('endorsed').notNull().default(false),
    createdAtBlock: bigint('created_at_block', { mode: 'bigint' }),
    updatedAtBlock: bigint('updated_at_block', { mode: 'bigint' }).notNull(),
  },
  (table) => [index('providers_provider_address_idx').on(table.providerAddress)]
)

export const dataSets = pgTable(
  tableNames.dataSets,
  {
    dataSetId: bigint('data_set_id', { mode: 'bigint' }).primaryKey(),
    providerId: bigint('provider_id', { mode: 'bigint' }).notNull(),
    payer: text('payer').notNull(),
    source: text('source'),
    metadata: jsonb('metadata').$type<JsonRecord | null>(),
    withCdn: boolean('with_cdn').notNull(),
    withIpfsIndexing: boolean('with_ipfs_indexing').notNull(),
    pdpEndEpoch: bigint('pdp_end_epoch', { mode: 'bigint' }),
    deleted: boolean('deleted').notNull(),
    createdAtBlock: bigint('created_at_block', { mode: 'bigint' }).notNull(),
    updatedAtBlock: bigint('updated_at_block', { mode: 'bigint' }).notNull(),
  },
  (table) => [index('data_sets_provider_id_idx').on(table.providerId)]
)

export const pieces = pgTable(
  tableNames.pieces,
  {
    dataSetId: bigint('data_set_id', { mode: 'bigint' }).notNull(),
    pieceId: bigint('piece_id', { mode: 'bigint' }).notNull(),
    cid: text('cid').notNull(),
    rawSize: bigint('raw_size', { mode: 'bigint' }).notNull(),
    metadata: jsonb('metadata').$type<JsonRecord | null>(),
    removed: boolean('removed').notNull(),
    addedAtBlock: bigint('added_at_block', { mode: 'bigint' }).notNull(),
    removedAtBlock: bigint('removed_at_block', { mode: 'bigint' }),
    updatedAtBlock: bigint('updated_at_block', { mode: 'bigint' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.dataSetId, table.pieceId] }), index('pieces_cid_idx').on(table.cid)]
)

export const tables = {
  providers,
  dataSets,
  pieces,
} as const
