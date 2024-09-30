import { config } from 'dotenv'
import { createConfig } from '@ponder/core'
import { http } from 'viem'

import {
  ENSRegistry,
  ETHRegistrarController,
  NameWrapper,
  PublicResolver,
} from './abis'

config({
  path: process.env.ENV_FILE || '../../.env',
})

export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: process.env.DATABASE_URL,
  },
  networks: {
    arbitrum_sepolia: {
      chainId: 421614,
      transport: http(process.env.RPC_URL),
    },
  },
  contracts: {
    ENSRegistry: {
      network: 'arbitrum_sepolia',
      abi: ENSRegistry,
      address: '0x562ff080ab3cb5f92d6bd5bf86279fa684e9a906',
      startBlock: 83667849,
    },
    ETHRegistrarController: {
      network: 'arbitrum_sepolia',
      abi: ETHRegistrarController,
      address: '0xD06F3CB9E0E9781a9Fb2839B88460CE81f1E9037',
      startBlock: 83668595,
    },
    NameWrapper: {
      network: 'arbitrum_sepolia',
      abi: NameWrapper,
      address: '0x1357ad39eeb2cda21f69e699e8182c9fab387f1b',
      startBlock: 83668348,
    },
    PublicResolver: {
      network: 'arbitrum_sepolia',
      abi: PublicResolver,
      address: '0xa9112bd9c49fa41eda53a716279a56b383e2f898',
      startBlock: 83669075,
    },
  },
})
