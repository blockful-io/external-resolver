import { Domain, Address, Text, Contenthash } from '../entities'
import { PubKey } from '.'

export type Response = {
  value: string
  ttl: string
}

export type WritingProps = {
  data: `0x${string}`
  signature: `0x${string}`
}

export type NodeProps = Pick<Domain, 'node'>
export type RegisterDomainProps = Omit<
  Domain,
  'addresses' | 'texts' | 'createdAt' | 'updatedAt' | 'contenthash'
> & {
  addresses: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>[]
  texts: Omit<Text, 'id' | 'createdAt' | 'updatedAt'>[]
  contenthash: Omit<Contenthash, 'id' | 'createdAt' | 'updatedAt'> | undefined
}
export type ResolverProps = {
  resolver: `0x${string}`
  resolverVersion: string
}

export type TransferDomainProps = Pick<Domain, 'node' | 'owner'>
export type SetContentHashProps = ResolverProps &
  NodeProps &
  Pick<Contenthash, 'contenthash'>

export type GetDomainProps = Pick<Domain, 'node'> & {
  includeRelations?: boolean
}

export type SetAddressProps = NodeProps &
  ResolverProps & {
    addr: string
    coin: string
  }

export type GetAddressProps = NodeProps & {
  coin: string
}

export type GetTextProps = NodeProps & {
  key: string
}

export type SetTextProps = GetTextProps &
  ResolverProps & {
    value: string
  }

export type SetAbiProps = NodeProps &
  ResolverProps & {
    value: string
  }

export type SetPubkeyProps = NodeProps &
  ResolverProps & {
    x: `0x${string}`
    y: `0x${string}`
  }

export type GetPubkeyResponse = {
  value: PubKey
  ttl: string
}
