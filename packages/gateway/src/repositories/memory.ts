import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
} from '../types'
import { Address, Text, Domain } from '../entities'

export class InMemoryRepository {
  private domains: Map<string, Domain>
  private addresses: Map<string, Address>
  private texts: Map<string, Text>

  constructor() {
    this.domains = new Map()
    this.addresses = new Map()
    this.texts = new Map()
  }

  clear() {
    this.domains.clear()
    this.addresses.clear()
    this.texts.clear()
  }

  setDomains(domains: Map<string, Domain>) {
    this.domains = domains
  }

  setAddresses(addresses: Address[]) {
    this.addresses = addresses.reduce((map, addr) => {
      map.set(`${addr.domain.node}-${addr.coin}`, addr)
      return map
    }, new Map())
  }

  setTexts(texts: Text[]) {
    this.texts = texts.reduce((map, text) => {
      map.set(`${text.domain.node}-${text.key}`, text)
      return map
    }, new Map())
  }

  async mintDomain({
    node,
    ttl,
    contenthash,
  }: {
    node: `0x${string}`
    ttl: number
    contenthash?: `0x${string}`
  }): Promise<Domain | undefined> {
    if (this.domains.get(node)) {
      throw new Error('Domain already in use')
    }

    this.domains.set(node, {
      node,
      ttl,
      contenthash,
      addresses: [],
      texts: [],
    })
    return this.domains.get(node)
  }

  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<void> {
    const domain = this.domains.get(node)
    if (!domain) {
      throw new Error('Domain not found')
    }
    domain.contenthash = contenthash
  }

  async contentHash({
    node,
  }: GetAddressProps): Promise<`0x${string}` | undefined> {
    const domain = this.domains.get(node)
    return domain?.contenthash
  }

  async setAddr({
    node,
    addr: address,
    coin = 60, // ETH
  }: SetAddressProps): Promise<void> {
    const existingAddress = this.addresses.get(`${node}-${coin}`)
    if (existingAddress) {
      existingAddress.address = address
      return
    }
    const domain = this.domains.get(node)
    if (!domain) {
      throw new Error('Domain foreign key on address violated')
    }
    this.addresses.set(`${node}-${coin}`, { domain, address, coin })
  }

  async getAddr({
    node,
    coin = 60,
  }: GetAddressProps): Promise<string | undefined> {
    const address = this.addresses.get(`${node}-${coin}`)
    return address?.address
  }

  async setText({ node, key, value }: SetTextProps): Promise<void> {
    const existingText = this.texts.get(`${node}-${key}`)
    if (existingText) {
      existingText.value = value
      return
    }
    const domain = this.domains.get(node)
    if (!domain) {
      throw new Error('Domain foreign key on address violated')
    }
    this.texts.set(`${node}-${key}`, { key, value, domain })
  }

  async getText({ node, key }: GetTextProps): Promise<string | undefined> {
    const text = this.texts.get(`${node}-${key}`)
    return text?.value
  }
}
