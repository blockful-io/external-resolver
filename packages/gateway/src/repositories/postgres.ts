import 'reflect-metadata'
import { DataSource } from 'typeorm'

import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
  SetPubkeyProps,
  GetPubkeyResponse,
  SetAbiProps,
  TransferDomainProps,
  RegisterDomainProps,
  NodeProps,
} from '../types'
import { Address, Text, Domain, ContentHash, Pubkey, ABI } from '../entities'

/* The PostgresRepository class provides methods for setting and getting content
hash, address, and text data in a PostgreSQL database. */
export class PostgresRepository {
  private client: DataSource

  constructor(client: DataSource) {
    this.client = client
  }

  async verifyOwnership(
    node: `0x${string}`,
    address: `0x${string}`,
  ): Promise<boolean> {
    return await this.client
      .getRepository(Domain)
      .existsBy({ node, owner: address })
  }

  async register({
    name,
    node,
    parent,
    ttl,
    owner,
    resolver,
    resolverVersion,
  }: RegisterDomainProps) {
    await this.client.getRepository(Domain).upsert(
      [
        {
          name,
          node,
          parent,
          ttl,
          owner,
          resolver,
          resolverVersion,
        },
      ],
      {
        conflictPaths: ['node', 'owner'],
        skipUpdateIfNoValuesChanged: true,
      },
    )
  }

  async transfer({ node, owner }: TransferDomainProps) {
    await this.client.getRepository(Domain).update({ node }, { owner })
  }

  async getDomain({ node }: NodeProps): Promise<Domain | null> {
    return await this.client.getRepository(Domain).findOneBy({
      node,
    })
  }

  async getSubdomains({ node }: NodeProps): Promise<string[]> {
    const names = await this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('parent = :node', { node })
      .select(['domain.name'])
      .getMany()

    return names.map((n) => n.name)
  }

  async setContentHash({ node, contenthash }: SetContentHashProps) {
    await this.client.getRepository(ContentHash).update(
      { domain: node },
      {
        contentHash: contenthash,
      },
    )
  }

  async getContentHash({ node }: NodeProps): Promise<Response | undefined> {
    const domain = await this.client
      .getRepository(ContentHash)
      .createQueryBuilder('contentHash')
      .leftJoinAndMapOne(
        'contentHash.domain',
        Domain,
        'domain',
        'contentHash.domain = domain.node',
      )
      .where('contentHash.domain = :node ', { node })
      .select(['contentHash.contentHash', 'domain.ttl'])
      .getRawOne()

    if (domain)
      return {
        value: domain.contentHash_contentHash,
        ttl: domain.contentHash_ttl,
      }
  }

  async setAddr({
    node,
    addr: address,
    coin,
    resolver,
    resolverVersion,
  }: SetAddressProps) {
    await this.client.getRepository(Address).upsert(
      [
        {
          domain: node,
          address,
          coin,
          resolver,
          resolverVersion,
        },
      ],
      {
        conflictPaths: ['coin', 'domain'],
        skipUpdateIfNoValuesChanged: true,
      },
    )
  }

  async getAddr({
    node,
    coin,
  }: GetAddressProps): Promise<Response | undefined> {
    const addr = await this.client
      .getRepository(Address)
      .createQueryBuilder('addr')
      .leftJoinAndMapOne(
        'addr.domain',
        Domain,
        'domain',
        'addr.domain = domain.node',
      )
      .where('addr.domain = :node ', { node })
      .andWhere('addr.coin = :coin', { coin })
      .select(['addr.address', 'domain.ttl'])
      .getRawOne()

    if (addr) return { value: addr.addr_address, ttl: addr.domain_ttl || 300 } // default ttl value
  }

  async getAddresses({
    node,
  }: NodeProps): Promise<Pick<Address, 'address' | 'coin'>[]> {
    const addrs = await this.client
      .getRepository(Address)
      .createQueryBuilder('address')
      .select(['address.coin', 'address.address'])
      .where('address.domain = :node ', { node })
      .andWhere('length(address.address) > 0')
      .getMany()

    return addrs.map(({ coin, address }) => ({ address, coin }))
  }

  async getTexts({ node }: NodeProps): Promise<Pick<Text, 'key' | 'value'>[]> {
    const texts = await this.client
      .getRepository(Text)
      .createQueryBuilder('text')
      .select(['text.key', 'text.value'])
      .where('text.domain = :node ', { node })
      .andWhere('text.key != :key', { key: 'pubkey' })
      .andWhere('text.key != :key', { key: 'ABI' })
      .andWhere('length(text.value) > 0')
      .getMany()

    return texts.map(({ key, value }) => ({ key, value }))
  }

  async setText({ node, key, value, resolver, resolverVersion }: SetTextProps) {
    await this.client.getRepository(Text).upsert(
      {
        key,
        value,
        domain: node,
        resolver,
        resolverVersion,
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const text = await this.client
      .getRepository(Text)
      .createQueryBuilder('text')
      .leftJoinAndMapOne(
        'text.domain',
        Domain,
        'domain',
        'text.domain = domain.node',
      )
      .where('text.domain = :node ', { node })
      .andWhere('text.key = :key', { key })
      .select(['text.value', 'domain.ttl'])
      .getRawOne()

    if (text) return { value: text.text_value, ttl: text.domain_ttl || 300 } // default ttl value
  }

  async setPubkey({ node, x, y, resolver, resolverVersion }: SetPubkeyProps) {
    await this.client.getRepository(Pubkey).upsert(
      {
        x,
        y,
        domain: node,
        resolver,
        resolverVersion,
      },
      { conflictPaths: ['domain'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   * getPubkey reads the Pubkey attached to the domain
   */
  async getPubkey({ node }: NodeProps): Promise<GetPubkeyResponse | undefined> {
    const domain = await this.client
      .getRepository(Pubkey)
      .createQueryBuilder('pubkey')
      .leftJoinAndMapOne(
        'pubkey.domain',
        Domain,
        'domain',
        'pubkey.domain = domain.node',
      )
      .where('pubkey.domain = :node ', { node })
      .select(['pubkey.x', 'pubkey.y', 'domain.ttl'])
      .getRawOne()

    if (domain)
      return {
        value: { x: domain.pubkey_x, y: domain.pubkey_y },
        ttl: domain.abi_ttl,
      }
  }

  async setAbi({ node, abi, resolver, resolverVersion }: SetAbiProps) {
    await this.client.getRepository(ABI).upsert(
      {
        abi,
        domain: node,
        resolver,
        resolverVersion,
      },
      { conflictPaths: ['domain'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   *  getABI reads the ABI attached to the domain
   */
  async getABI({ node }: NodeProps): Promise<Response | undefined> {
    const domain = await this.client
      .getRepository(ABI)
      .createQueryBuilder('abi')
      .leftJoinAndMapOne(
        'abi.domain',
        Domain,
        'domain',
        'abi.domain = domain.node',
      )
      .where('abi.domain = :node ', { node })
      .select(['abi.abi', 'domain.ttl'])
      .getRawOne()

    if (domain) return { value: domain.abi_abi, ttl: domain.abi_ttl }
  }
}
