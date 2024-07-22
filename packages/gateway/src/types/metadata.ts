import { Domain } from '../entities'

export type Resolver = {
  id: string
  node: string
  context: string
  address: string
  domain: Domain
  addr?: string
  contentHash?: string
  texts: string[]
  coinTypes: string[]
}

export type DomainMetadata = {
  id: string
  context: string
  name: string
  namehash: string
  labelName: string
  labelhash: string
  resolvedAddress: string
  parent: Domain | string
  subdomains: DomainMetadata[]
  subdomainCount: number
  resolver: Resolver
  // expiryDate: BigInt
}
