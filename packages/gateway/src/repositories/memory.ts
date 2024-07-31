import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
  RegisterDomainProps,
  TransferDomainProps,
  DomainProps,
  SetAbiProps,
  GetPubkeyResponse,
  SetPubkeyProps,
  NodeProps,
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
      map.set(`${addr.domain}-${addr.coin}`, addr)
      return map
    }, new Map())
  }

  setTexts(texts: Text[]) {
    this.texts = texts.reduce((map, text) => {
      map.set(`${text.domain}-${text.key}`, text)
      return map
    }, new Map())
  }

  async verifyOwnership(
    node: `0x${string}`,
    address: `0x${string}`,
  ): Promise<boolean> {
    return this.domains.get(node)?.owner === address
  }

  async register({
    name,
    parent,
    node,
    ttl,
    owner,
    resolver,
    resolverVersion,
  }: RegisterDomainProps) {
    this.domains.set(node, {
      name,
      node,
      parent,
      addresses: [],
      texts: [],
      ttl,
      owner,
      resolver,
      resolverVersion,
    })
  }

  async transfer({ node, owner }: TransferDomainProps) {
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

  async setAddr({
    node,
    addr: address,
    coin,
    resolver,
    resolverVersion,
  }: SetAddressProps) {
    const existingAddress = this.addresses.get(`${node}-${coin}`)
    if (existingAddress) {
      existingAddress.address = address
      return
    }
    this.addresses.set(`${node}-${coin}`, {
      domain: node,
      address,
      coin,
      resolver,
      resolverVersion,
    })
  }

  async getAddr({
    node,
    coin,
  }: GetAddressProps): Promise<Response | undefined> {
    const address = this.addresses.get(`${node}-${coin}`)
    const domain = this.domains.get(node)
    let ttl = domain?.ttl
    if (!address) return
    if (!domain || !ttl) ttl = 300 // default value
    return { value: address.address, ttl }
  }

  async setText({
    node,
    key,
    value,
    resolver,
    resolverVersion,
  }: SetTextProps): Promise<void> {
    const existingText = this.texts.get(`${node}-${key}`)
    if (existingText) {
      existingText.value = value
      return
    }
    this.texts.set(`${node}-${key}`, {
      key,
      value,
      domain: node,
      resolver,
      resolverVersion,
    })
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const text = this.texts.get(`${node}-${key}`)
    const domain = this.domains.get(node)
    let ttl = domain?.ttl
    if (!text) return
    if (!domain || !ttl) ttl = 300 // default value
    return { value: text.value, ttl }
  }

  async setPubkey({ node, x, y, resolver, resolverVersion }: SetPubkeyProps) {
    await this.setText({
      node,
      key: 'pubkey',
      value: `(${x},${y})`,
      resolver,
      resolverVersion,
    })
  }

  /**
   * getPubkey reutilized the getText function with `pubkey` as a reserved key
   */
  async getPubkey({ node }: NodeProps): Promise<GetPubkeyResponse | undefined> {
    const pubkey = await this.getText({ node, key: 'pubkey' })
    if (!pubkey) return

    // extracting the X and Y values from a string (e.g (0x10A,0x20D) -> x = 0x10A, y = 0x20D)
    const [, x, y] = /\((0x\w+),(0x\w+)\)/g.exec(pubkey.value) || []
    return { value: { x, y }, ttl: pubkey.ttl }
  }

  async setAbi({ node, value, resolver, resolverVersion }: SetAbiProps) {
    await this.setText({ node, key: 'ABI', value, resolver, resolverVersion })
  }

  /**
   *  getABI reutilized the getText function with `ABI` as a reserved key
   */
  async getABI({ node }: NodeProps): Promise<Response | undefined> {
    return await this.getText({ node, key: 'ABI' })
  }
}
