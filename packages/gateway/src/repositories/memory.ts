import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
} from '../types'
import { Address, Text, Domain } from '../entities'

/* The `InMemoryRepository` is a repository implementation that
stores domains, addresses, and texts in memory and provides methods for changing values
for testing purposes. */
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

  async getContentHash({
    node,
  }: GetAddressProps): Promise<Response | undefined> {
    const domain = this.domains.get(node)
    if (!domain) return
    return { value: domain.contenthash as string, ttl: domain.ttl }
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
  }: GetAddressProps): Promise<Response | undefined> {
    const address = this.addresses.get(`${node}-${coin}`)
    const domain = this.domains.get(node)
    if (!address || !domain) return
    return { value: address.address, ttl: domain.ttl }
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

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const text = this.texts.get(`${node}-${key}`)
    const domain = this.domains.get(node)
    if (!text || !domain) return
    return { value: text.value, ttl: domain.ttl }
  }
}
