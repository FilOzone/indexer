import {
  dataSets,
  pieces,
  providers,
  railSettlements,
  rails,
  sessionKeyEvents,
  sessionKeyPermissions,
} from '../../../apps/ponder/ponder.schema.ts'

export type { JsonRecord } from '../../../apps/ponder/ponder.schema.ts'
export { dataSets, pieces, providers, railSettlements, rails, sessionKeyEvents, sessionKeyPermissions }

export const tables = {
  providers,
  dataSets,
  pieces,
  rails,
  railSettlements,
  sessionKeyPermissions,
  sessionKeyEvents,
} as const
