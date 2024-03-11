export type Response = { value: string }

export type DomainProps = {
  node: string
}

export type SetContentHashProps = {
  node: string
  contenthash: string
}

export type SetAddressProps = {
  node: string
  addr: string
  coin?: number
}

export type GetAddressProps = {
  node: string
  coin?: number
}

export type SetTextProps = {
  node: string
  key: string
  value: string
}

export type GetTextProps = {
  node: string
  key: string
}
