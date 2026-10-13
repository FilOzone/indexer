import { metadataArrayToObject } from '@filoz/synapse-core/utils'

export function metadataFromEntries(keys: readonly string[], values: readonly string[]): Record<string, string> | null {
  return keys.length === 0 ? null : metadataArrayToObject([keys, values])
}
