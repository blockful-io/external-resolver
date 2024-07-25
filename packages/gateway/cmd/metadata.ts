import { config } from 'dotenv'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { createPublicClient, http } from 'viem'

import { getChain } from '../src/chain'
import { NewDataSource } from '../src/datasources/postgres'
import { domainResolver } from '../src/resolvers'
import { EthereumClient } from '../src/services'
import { PostgresRepository } from '../src/repositories'

config({
  path: process.env.ENV_FILE || '../../../.env',
})

const typeDefs = `#graphql
  scalar Bytes
  scalar BigInt

  type Domain {
    id: ID!
    context: Bytes
    name: String
    namehash: Bytes
    labelName: String
    labelhash: Bytes
    resolvedAddress: Bytes
    parent: Domain
    subdomains: [String]
    subdomainCount: Int!
    resolver: Resolver!
    expiryDate: BigInt
  }

  type Text {
    key: String
    value: String
  }

  type Address {
    address: Bytes
    coin: BigInt
  }

  type Resolver {
    id: ID!
    node: Bytes
    context: Bytes
    address: Bytes
    addr: Bytes
    contentHash: Bytes
    texts: [Text!]
    addresses: [Address!]
  }

  type Query {
    domain(name: String!): Domain
  }
`

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new PostgresRepository(dbclient)

  const rpcURL = process.env.RPC_URL || 'http://localhost:8545'
  const chainID = process.env.CHAIN_ID || '31337'
  const chain = getChain(parseInt(chainID))
  if (!chain) throw new Error(`invalid chain: ${chainID}`)
  console.log(`Connected to chain: ${chain.name}`)
  const client = createPublicClient({
    chain,
    transport: http(rpcURL),
  })
  const ethClient = new EthereumClient(client, process.env.ENS_REGISTRY)

  const resolvers = {
    Query: {
      domain: async (_, name) => domainResolver(name, repo, ethClient),
    },
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  })

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  })

  console.log(`🚀  Server ready at: ${url}`)
})()
