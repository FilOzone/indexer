import type { JsonRecord } from '../../ponder.schema.ts'

/** FWSS metadata key that enables FilBeam CDN; FWSS checks for the key, not its value. */
export const WITH_CDN = 'withCDN'
/** Metadata key that asks the provider to index the data set for IPFS; by convention only the key matters. */
export const WITH_IPFS_INDEXING = 'withIPFSIndexing'

/** Whether data set metadata has a key, whatever its value, as FWSS `hasCDNMetadataKey` checks. */
export function hasMetadataKey(metadata: JsonRecord | null, key: string): boolean {
  return metadata !== null && Object.hasOwn(metadata, key)
}

/** Metadata without one key, or null when nothing is left, as FWSS stores it after deleting a key. */
export function withoutMetadataKey(metadata: JsonRecord | null, key: string): JsonRecord | null {
  if (!hasMetadataKey(metadata, key)) return metadata
  const { [key]: _, ...rest } = metadata as JsonRecord
  return Object.keys(rest).length === 0 ? null : rest
}
