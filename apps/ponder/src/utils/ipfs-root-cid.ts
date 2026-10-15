import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'

const decoder = base32.decoder.or(base58btc.decoder).or(base36.decoder)

/**
 * Normalize an `ipfsRootCID` metadata value to a CIDv1 base32 string, so one exact match finds a root however the app
 * spelled it. CIDv0 becomes its dag-pb CIDv1. Returns null when the value is missing or isn't a CID.
 */
export function normalizeIpfsRootCid(value: string | undefined): string | null {
  if (!value) return null
  try {
    return CID.parse(value.trim(), decoder).toV1().toString()
  } catch {
    return null
  }
}
