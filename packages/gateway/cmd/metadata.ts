import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import { NewDataSource } from '../src/datasources/postgres'
import { PostgresRepository } from '../src/repositories'
import { domainResolver } from '../src/resolvers'

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
    subdomains: [Domain]
    subdomainCount: Int!
    resolver: Resolver!
    # expiryDate: BigInt
  }

  type Resolver {
    id: ID!
    node: Bytes
    context: Bytes
    address: Bytes
    domain: Domain
    addr: Bytes
    contentHash: Bytes
    texts: [String!]
    coinTypes: [BigInt!]
  }

  type Query {
    domain(name: String!): Domain
  }
`

// eslint-disable-next-line
const _ = (async () => {
  // const dbUrl = process.env.DATABASE_URL
  // if (!dbUrl) {
  //   throw new Error('DATABASE_URL is required')
  // }

  const dbUrl = 'postgresql://blockful:ensdomains@localhost:5432/ensdomains'
  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new PostgresRepository(dbclient)

  const resolvers = {
    Query: {
      domain: async (_, name) => domainResolver(name, repo),
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
