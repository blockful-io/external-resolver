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
  expiryDate: bigint
}
