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
      address: '0x83686f21bdf2289eb4f6a837c271330851ada373',
      startBlock: 85597983,
    },
    ETHRegistrarController: {
      network: 'arbitrum_sepolia',
      abi: ETHRegistrarController,
      address: '0xd01c56789c783aab5d1cbf7f8a62115a041c0d42',
      startBlock: 85598659,
    },
    NameWrapper: {
      network: 'arbitrum_sepolia',
      abi: NameWrapper,
      address: '0xd23e62032eb539264cab21c1fb9978fe4092a918',
      startBlock: 85598409,
    },
    PublicResolver: {
      network: 'arbitrum_sepolia',
      abi: PublicResolver,
      address: '0xd9555fc98250d60974cf50cbf42ffff361fe352e',
      startBlock: 85599473,
    },
  },
})
