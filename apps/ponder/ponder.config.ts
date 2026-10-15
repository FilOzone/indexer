import { createConfig } from 'ponder'
import { NETWORKS } from './src/networks.ts'
import { env } from './src/utils/env.ts'
import { parseNetwork } from './src/utils/parse-network.ts'
import { parseStrictEnv } from './src/utils/parse-strict-env.ts'
import { rpcTransport } from './src/utils/rpc-transport.ts'

const DEFAULT_DATABASE_URL = 'postgres://ponder:ponder@localhost:17825/ponder'
const DEFAULT_RPC_URL = 'http://localhost:1234/rpc/v1'

const strictEnv = parseStrictEnv(process.env.PONDER_STRICT_ENV)
const networkName = parseNetwork(process.env.PONDER_NETWORK, strictEnv)
const network = NETWORKS[networkName]
const { contracts } = network.chain

export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: env('DATABASE_URL', DEFAULT_DATABASE_URL, strictEnv),
  },
  chains: {
    [networkName]: {
      id: network.chain.id,
      rpc: rpcTransport(env('RPC_URL', DEFAULT_RPC_URL, strictEnv)),
      pollingInterval: 30_000,
    },
  },
  contracts: {
    FWSS: {
      abi: contracts.fwss.abi,
      chain: networkName,
      address: contracts.fwss.address,
      startBlock: network.startBlock,
    },
    PDPVerifier: {
      abi: contracts.pdp.abi,
      chain: networkName,
      address: contracts.pdp.address,
      startBlock: network.startBlock,
    },
    SPRegistry: {
      abi: contracts.serviceProviderRegistry.abi,
      chain: networkName,
      address: contracts.serviceProviderRegistry.address,
      startBlock: network.startBlock,
    },
    FilecoinPay: {
      abi: contracts.filecoinPay.abi,
      chain: networkName,
      address: contracts.filecoinPay.address,
      startBlock: network.filecoinPayStartBlock,
    },
    SessionKeyRegistry: {
      abi: contracts.sessionKeyRegistry.abi,
      chain: networkName,
      address: contracts.sessionKeyRegistry.address,
      startBlock: network.sessionKeyRegistryStartBlock,
    },
  },
  blocks: {
    ProviderStatusSync: {
      chain: networkName,
      startBlock: network.endorsementSetStartBlock,
      interval: 480,
    },
  },
})
