import {
  dataSets,
  pieces,
  providers,
  railOneTimePayments,
  railSettlements,
  rails,
  sessionKeyEvents,
  sessionKeyPermissions,
} from '../../../apps/ponder/ponder.schema.ts'

export type { JsonRecord } from '../../../apps/ponder/ponder.schema.ts'
export {
  dataSets,
  pieces,
  providers,
  railOneTimePayments,
  railSettlements,
  rails,
  sessionKeyEvents,
  sessionKeyPermissions,
}

export const tables = {
  providers,
  dataSets,
  pieces,
  rails,
  railSettlements,
  railOneTimePayments,
  sessionKeyPermissions,
  sessionKeyEvents,
} as const
