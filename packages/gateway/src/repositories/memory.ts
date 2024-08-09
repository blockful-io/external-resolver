import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
  RegisterDomainProps,
  TransferDomainProps,
  SetAbiProps,
  GetPubkeyResponse,
  SetPubkeyProps,
  NodeProps,
} from '../types'
import { Address, Text, Domain, ABI, ContentHash, Pubkey } from '../entities'

/* The `InMemoryRepository` is a repository implementation that
stores domains, addresses, and texts in memory and provides methods for changing values
for testing purposes. */
export class InMemoryRepository {
  private domains: Map<string, Domain>
  private addresses: Map<string, Address>
  private texts: Map<string, Text>
  private abis: Map<string, ABI>
  private pubkeys: Map<string, Pubkey>
  private contenthash: Map<string, ContentHash>

  constructor() {
    this.domains = new Map()
    this.addresses = new Map()
    this.texts = new Map()
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

  async getDomain({ node }: NodeProps): Promise<Domain | null> {
    return this.domains.get(node) || null
  }

  async setContentHash({
    node,
    contenthash,
    resolver,
    resolverVersion,
  }: SetContentHashProps) {
    this.contenthash.set(node, {
      contentHash: contenthash,
      domain: node,
      resolver,
      resolverVersion,
    })
  }

  async getContentHash({
    node,
  }: GetAddressProps): Promise<Response | undefined> {
    const domain = this.domains.get(node)
    const content = this.contenthash.get(node)
    if (content) return { value: content.contentHash, ttl: domain?.ttl || 300 }
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
    if (!address) return
    return { value: address.address, ttl: domain?.ttl || 300 }
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
    if (!text) return
    return { value: text.value, ttl: domain?.ttl || 300 }
  }

  async setPubkey({ node, x, y, resolver, resolverVersion }: SetPubkeyProps) {
    await this.pubkeys.set(node, {
      domain: node,
      x,
      y,
      resolver,
      resolverVersion,
    })
  }

  /**
   * getPubkey stores the pubkey attached to the domain
   */
  async getPubkey({ node }: NodeProps): Promise<GetPubkeyResponse | undefined> {
    const domain = this.domains.get(node)
    const pubkey = await this.pubkeys.get(node)
    if (pubkey)
      return { value: { x: pubkey.x, y: pubkey.y }, ttl: domain?.ttl || 300 }
  }

  async setAbi({ node, abi, resolver, resolverVersion }: SetAbiProps) {
    await this.abis.set(node, {
      domain: node,
      abi,
      resolver,
      resolverVersion,
    })
  }

  /**
   *  getABI stores the ABI attached to the domain
   */
  async getABI({ node }: NodeProps): Promise<Response | undefined> {
    const domain = this.domains.get(node)
    const abi = await this.abis.get(node)
    if (abi) return { value: abi.abi, ttl: domain?.ttl || 300 }
  }
}
