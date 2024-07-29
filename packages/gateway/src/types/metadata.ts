export const typeDefs = `#graphql
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
    parent: Bytes
    subdomains: [String]
    subdomainCount: Int!
    resolver: Resolver!
    expiryDate: String
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

export interface Text {
  key: string
  value: string
}

export interface Address {
  address: string
  coin: string
}

export interface Resolver {
  id: string
  node: string
  context: string
  address: string
  addr?: string
  contentHash?: string
  texts: Text[]
  addresses: Address[]
}

export interface DomainMetadata {
  id: string
  context: string
  name: string
  namehash: string
  labelName: string
  labelhash: string
  resolvedAddress: string
  parent: string
  subdomains: string[]
  subdomainCount: number
  resolver: Resolver
  expiryDate: string
}
