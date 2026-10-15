import { calibration, type FilecoinChain, mainnet } from '@filoz/synapse-core/chains'

export type NetworkName = 'mainnet' | 'calibnet'

export interface Network {
  chain: FilecoinChain
  /** 10 blocks before FWSS proxy creation. */
  startBlock: number
  endorsementSetStartBlock: number
  /** FilecoinPay deployment block. */
  filecoinPayStartBlock: number
  /** SessionKeyRegistry deployment block. */
  sessionKeyRegistryStartBlock: number
}

export const NETWORKS = {
  mainnet: {
    chain: mainnet,
    startBlock: 5_459_607,
    endorsementSetStartBlock: 5_664_991,
    filecoinPayStartBlock: 5_421_337,
    sessionKeyRegistryStartBlock: 5_459_604,
  },
  calibnet: {
    chain: calibration,
    startBlock: 3_141_266,
    endorsementSetStartBlock: 3_364_286,
    filecoinPayStartBlock: 3_120_649,
    sessionKeyRegistryStartBlock: 3_185_523,
  },
} as const satisfies Record<NetworkName, Network>
