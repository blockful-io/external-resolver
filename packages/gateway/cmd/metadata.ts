import { config } from 'dotenv'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { Hex, createPublicClient, getChainContractAddress, http } from 'viem'

import { getChain } from '../src/chain'
import { NewDataSource } from '../src/datasources/postgres'
import { domainResolver } from '../src/resolvers'
import { EthereumClient } from '../src/services'
import { PostgresRepository } from '../src/repositories'
import { typeDefs } from '../src/types'

config({
  path: process.env.ENV_FILE || '../../../.env',
})

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required')
  }
  const resolverAddress = process.env.RESOLVER_ADDRESS as Hex
  if (!resolverAddress) {
    throw new Error('RESOLVER_ADDRESS is required')
  }

  const synchronize = process.env.DB_MIGRATE
    ? process.env.DB_MIGRATE === 'true'
    : undefined
  const dbClient = await NewDataSource(dbUrl, { synchronize }).initialize()
  const repo = new PostgresRepository(dbClient)

  const rpcURL = process.env.RPC_URL || 'http://localhost:8545'
  const chainId = process.env.CHAIN_ID || '31337'
  const chain = getChain(parseInt(chainId))
  if (!chain) throw new Error(`invalid chain: ${chainId}`)
  console.log(`Connected to chain: ${chain.name}`)

  const client = createPublicClient({
    chain,
    transport: http(rpcURL),
  })
  const ethClient = new EthereumClient(
    client,
    (process.env.REGISTRY_ADDRESS as Hex) ||
      getChainContractAddress({
        chain: client.chain!,
        contract: 'ensRegistry',
      }),
    (process.env.REGISTRAR_ADDRESS as Hex) ||
      getChainContractAddress({
        chain: client.chain!,
        contract: 'ensBaseRegistrarImplementation',
      }),
  )

  const resolvers = {
    Query: {
      domain: async (_, name) =>
        await domainResolver({
          name,
          repo,
          client: ethClient,
          resolverAddress,
        }),
    },
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  })

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT || '3000') },
  })

  console.log(`🚀  Server ready at: ${url}`)
})()
