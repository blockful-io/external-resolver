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
    schema: 'public',
  },
  networks: {
    arbitrum_sepolia: {
      chainId: 421614,
      transport: http(process.env.RPC_URL),
      pollingInterval: parseInt(process.env.POOL_INTERVAL || '1000'),
      maxRequestsPerSecond: parseInt(process.env.MAX_REQUESTS || '50'),
    },
  },
  contracts: {
    ENSRegistry: {
      network: 'arbitrum_sepolia',
      abi: ENSRegistry,
      address: '0x8d55e297c37993ebbd2e7a8d7688f7e5b35f1b50',
      startBlock: 89197400,
    },
    ETHRegistrarController: {
      network: 'arbitrum_sepolia',
      abi: ETHRegistrarController,
      address: '0x263c644d8f5d4bdb44cfab020491ec6fc4ca5271',
      startBlock: 89197400,
    },
    NameWrapper: {
      network: 'arbitrum_sepolia',
      abi: NameWrapper,
      address: '0xff4f34ac12a84de527cf9e24856fc8d7c42cc379',
      startBlock: 89197400,
    },
    PublicResolver: {
      network: 'arbitrum_sepolia',
      abi: PublicResolver,
      address: '0x0a33f065c9c8f0F5c56BB84b1593631725F0f3af',
      startBlock: 89197400,
    },
  },
})
