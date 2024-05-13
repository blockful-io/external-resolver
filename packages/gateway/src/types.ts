import { Hex, SignableMessage } from 'viem'

export type Response = {
  value: string
  ttl: number
}

export type DomainProps = {
  node: `0x${string}`
}

export type WritingProps = {
  data: `0x${string}`
  signature: `0x${string}`
}

export type RegisterDomainProps = {
  node: `0x${string}`
  ttl: number
}

export type SetContentHashProps = {
  node: `0x${string}`
  contenthash: `0x${string}`
}

export type SetAddressProps = {
  node: `0x${string}`
  addr: string
  coin?: number
}

export type GetAddressProps = {
  node: `0x${string}`
  coin?: number
}

export type SetTextProps = {
  node: `0x${string}`
  key: string
  value: string
}

export type GetTextProps = {
  node: `0x${string}`
  key: string
}

export interface Signer {
  sign: (msg: SignableMessage) => Promise<Hex>
}
