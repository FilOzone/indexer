import {
  dataSets,
  pieces,
  providers,
  sessionKeyEvents,
  sessionKeyPermissions,
} from '../../../apps/ponder/ponder.schema.ts'

export type { JsonRecord } from '../../../apps/ponder/ponder.schema.ts'
export { dataSets, pieces, providers, sessionKeyEvents, sessionKeyPermissions }

export const tables = {
  providers,
  dataSets,
  pieces,
  sessionKeyPermissions,
  sessionKeyEvents,
} as const
