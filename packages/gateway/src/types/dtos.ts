import { Domain, Address, Text } from '../entities'
import { PubKey } from '.'

export type Response = {
  value: string
  ttl: number
}

export type WritingProps = {
  data: `0x${string}`
  signature: `0x${string}`
}

export type NodeProps = Pick<Domain, 'node'>
export type RegisterDomainProps = Omit<
  Domain,
  'addresses' | 'texts' | 'createdAt' | 'updatedAt'
> & {
  addresses: Pick<
    Address,
    'address' | 'coin' | 'domain' | 'resolver' | 'resolverVersion'
  >[]
  texts: Pick<
    Text,
    'key' | 'value' | 'domain' | 'resolver' | 'resolverVersion'
  >[]
}
export type TransferDomainProps = Pick<Domain, 'node' | 'owner'>
export type SetContentHashProps = Pick<Domain, 'node' | 'contenthash'>

export type ResolverProps = {
  resolver: `0x${string}`
  resolverVersion: string
}

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
  ttl: number
}
