import { type Hex, hexToString } from 'viem'

/**
 * The PDP `serviceURL` capability, or null when it's missing or can't be decoded. Reads only this key, so a provider
 * with other malformed capabilities can't stop indexing.
 */
export function serviceUrlFromCapabilities(keys: readonly string[], values: readonly Hex[]): string | null {
  const index = keys.indexOf('serviceURL')
  if (index === -1 || values[index] === undefined) return null
  try {
    return hexToString(values[index])
  } catch {
    return null
  }
}
