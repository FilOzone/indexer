import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type {
  dataSets,
  pieces,
  providers,
  railSettlements,
  rails,
  sessionKeyEvents,
  sessionKeyPermissions,
} from './schema.ts'

export type Provider = InferSelectModel<typeof providers>
export type NewProvider = InferInsertModel<typeof providers>

export type DataSet = InferSelectModel<typeof dataSets>
export type NewDataSet = InferInsertModel<typeof dataSets>

export type Piece = InferSelectModel<typeof pieces>
export type NewPiece = InferInsertModel<typeof pieces>

export type Rail = InferSelectModel<typeof rails>
export type NewRail = InferInsertModel<typeof rails>

export type RailSettlement = InferSelectModel<typeof railSettlements>
export type NewRailSettlement = InferInsertModel<typeof railSettlements>

export type SessionKeyPermission = InferSelectModel<typeof sessionKeyPermissions>
export type NewSessionKeyPermission = InferInsertModel<typeof sessionKeyPermissions>

export type SessionKeyEvent = InferSelectModel<typeof sessionKeyEvents>
export type NewSessionKeyEvent = InferInsertModel<typeof sessionKeyEvents>
