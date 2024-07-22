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

export type NodeProps = {
  node: `0x${string}`
}

export type SetAddressProps = NodeProps & {
  addr: string
  coin: string
}

export type GetAddressProps = NodeProps & {
  coin: string
}

export type GetTextProps = NodeProps & {
  key: string
}

export type SetTextProps = GetTextProps & {
  value: string
}

export type SetAbiProps = NodeProps & {
  value: string
}

export type SetPubkeyProps = NodeProps & {
  x: `0x${string}`
  y: `0x${string}`
}

export type GetPubkeyResponse = {
  value: PubKey
  ttl: number
}
