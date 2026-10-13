import type { NetworkName } from '../networks.ts'

export function parseNetwork(value: string | undefined, strict: boolean): NetworkName {
  if (value === undefined || value === '') {
    if (strict) throw new Error('PONDER_NETWORK is required when PONDER_STRICT_ENV=true')
    return 'mainnet'
  }
  if (value === 'mainnet' || value === 'calibnet') return value
  throw new Error(`Unsupported PONDER_NETWORK "${value}". Expected "mainnet" or "calibnet".`)
}
