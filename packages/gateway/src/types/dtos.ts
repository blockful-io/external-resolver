import { Domain } from '../entities'
import { PubKey } from '.'

export type Response = {
  value: string
  ttl: number
}

export type WritingProps = {
  data: `0x${string}`
  signature: `0x${string}`
}

export type DomainProps = Pick<Domain, 'node'>
export type RegisterDomainProps = Omit<
  Domain,
  'subdomains' | 'addresses' | 'texts' | 'createdAt' | 'updatedAt'
>
export type TransferDomainProps = Pick<Domain, 'node' | 'owner'>
export type SetContentHashProps = Pick<Domain, 'node' | 'contenthash'>

export type ResolverProps = {
  resolver: `0x${string}`
  resolverVersion: string
}

export type NodeProps = {
  node: `0x${string}`
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
