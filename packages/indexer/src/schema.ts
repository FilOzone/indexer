import { dataSets, pieces, providers } from '../../../apps/ponder/ponder.schema.ts'

export type { JsonRecord } from '../../../apps/ponder/ponder.schema.ts'
export { dataSets, pieces, providers }

export const tables = {
  providers,
  dataSets,
  pieces,
} as const
