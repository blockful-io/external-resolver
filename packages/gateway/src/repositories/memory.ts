import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
  DomainProps,
  RegisterDomainProps,
  GetAbiProps,
  SetAbiProps,
  GetPubkeyProps,
  GetPubkeyResponse,
  SetPubkeyProps,
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

  async verifyOwnership(
    node: `0x${string}`,
    address: `0x${string}`,
  ): Promise<boolean> {
    return this.domains.get(node)?.owner === address
  }

  async register({ node, ttl, owner }: RegisterDomainProps) {
    this.domains.set(node, { node, addresses: [], texts: [], ttl, owner })
  }

  async transfer({
    node,
    owner,
  }: {
    node: `0x${string}`
    owner: `0x${string}`
  }) {
    const existingNode = this.domains.get(node)
    if (!existingNode) {
      throw Error('Node not found')
    }
    await this.domains.set(node, {
      ...existingNode,
      owner,
    })
  }

  async getDomain({ node }: DomainProps): Promise<Domain | null> {
    return this.domains.get(node) || null
  }

  async setContentHash({ node, contenthash }: SetContentHashProps) {
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

  async setAddr({ node, addr: address, coin }: SetAddressProps) {
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
    coin,
  }: GetAddressProps): Promise<Response | undefined> {
    const address = this.addresses.get(`${node}-${coin}`)
    const domain = this.domains.get(node)
    if (!address || !domain) return
    return { value: address.address, ttl: domain.ttl }
  }

  async setText({ node, key, value }: SetTextProps): Promise<void> {
    const domain = this.domains.get(node)
    if (!domain) {
      throw new Error('Domain foreign key on address violated')
    }
    const existingText = this.texts.get(`${node}-${key}`)
    if (existingText) {
      existingText.value = value
      return
    }
    this.texts.set(`${node}-${key}`, { key, value, domain })
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const text = this.texts.get(`${node}-${key}`)
    const domain = this.domains.get(node)
    if (!text || !domain) return
    return { value: text.value, ttl: domain.ttl }
  }

  async setPubkey({ node, x, y }: SetPubkeyProps) {
    await this.setText({ node, key: 'pubkey', value: `(${x},${y})` })
  }

  /**
   * getPubkey reutilized the getText function with `pubkey` as a reserved key
   */
  async getPubkey({
    node,
  }: GetPubkeyProps): Promise<GetPubkeyResponse | undefined> {
    const pubkey = await this.getText({ node, key: 'pubkey' })
    if (!pubkey) return

    // extracting the X and Y values from a string (e.g (0x10A,0x20D) -> x = 0x10A, y = 0x20D)
    const [, x, y] = /\((0x\w+),(0x\w+)\)/g.exec(pubkey.value) || []
    return { value: { x, y }, ttl: pubkey.ttl }
  }

  async setAbi({ node, value }: SetAbiProps) {
    await this.setText({ node, key: 'ABI', value })
  }

  /**
   *  getABI reutilized the getText function with `ABI` as a reserved key
   */
  async getABI({ node }: GetAbiProps): Promise<Response | undefined> {
    return await this.getText({ node, key: 'ABI' })
  }
}
