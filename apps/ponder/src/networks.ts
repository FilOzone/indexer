import { calibration, type FilecoinChain, mainnet } from '@filoz/synapse-core/chains'

export type NetworkName = 'mainnet' | 'calibnet'

export interface Network {
  chain: FilecoinChain
  /** 10 blocks before FWSS proxy creation. */
  startBlock: number
  endorsementSetStartBlock: number
}

export const NETWORKS = {
  mainnet: {
    chain: mainnet,
    startBlock: 5_459_607,
    endorsementSetStartBlock: 5_664_991,
  },
  calibnet: {
    chain: calibration,
    startBlock: 3_141_266,
    endorsementSetStartBlock: 3_364_286,
  },
} as const satisfies Record<NetworkName, Network>
