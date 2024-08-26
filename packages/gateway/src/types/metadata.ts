export const typeDefs = `#graphql
  scalar Bytes
  scalar BigInt

  type Domain {
    id: ID!
    context: Bytes
    owner: Bytes
    name: String
    node: Bytes
    label: String
    labelhash: Bytes
    resolvedAddress: Bytes
    parent: String
    parentNode: Bytes
    subdomains: [Domain!]
    subdomainCount: Int!
    resolver: Resolver!
    expiryDate: BigInt!
    registerDate: BigInt
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
  node: `0x${string}`
  context: string
  address: `0x${string}`
  addr?: string
  contentHash?: `0x${string}`
  texts: Text[]
  addresses: Address[]
}

export interface DomainMetadata {
  id: string
  context: string
  owner: `0x${string}`
  name: string
  node: `0x${string}`
  label: string
  labelhash: `0x${string}`
  resolvedAddress: `0x${string}`
  parent: string
  parentNode: `0x${string}`
  subdomains?: DomainMetadata[]
  subdomainCount?: number
  resolver: Resolver
  expiryDate: bigint
  registerDate?: bigint
}
