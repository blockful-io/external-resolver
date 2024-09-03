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
  GetDomainProps,
} from '../types'
import { Address, Text, Domain } from '../entities'

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
    addresses,
    texts,
  }: RegisterDomainProps) {
    await this.client.getRepository(Domain).insert({
      name,
      node,
      parent,
      ttl,
      owner,
      resolver,
      resolverVersion,
    })

    // TODO: Find a way to insert the relations in a single query relying on cascade
    if (addresses) {
      await this.client.getRepository(Address).insert(addresses)
    }

    if (texts) {
      await this.client.getRepository(Text).insert(texts)
    }
  }

  async transfer({ node, owner }: TransferDomainProps) {
    await this.client.getRepository(Domain).update({ node }, { owner })
  }

  async getDomain({
    node,
    includeRelations: includeEntities = false,
  }: GetDomainProps): Promise<Domain | null> {
    const query = this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('domain.node = :node', { node })

    if (includeEntities) {
      query
        .leftJoinAndMapMany(
          'domain.addresses',
          Address,
          'addr',
          'addr.domain = domain.node',
        )
        .leftJoinAndMapMany(
          'domain.texts',
          Text,
          'text',
          'text.domain = domain.node',
        )
    }
    return await query.getOne()
  }

  async getSubdomains({ node }: NodeProps): Promise<Domain[]> {
    return await this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('parent = :node', { node })
      .leftJoinAndMapMany(
        'domain.addresses',
        Address,
        'addr',
        'addr.domain = domain.node',
      )
      .leftJoinAndMapMany(
        'domain.texts',
        Text,
        'text',
        'text.domain = domain.node',
      )
      .getMany()
  }

  async setContentHash({ node, contenthash }: SetContentHashProps) {
    await this.client.getRepository(Domain).update(
      { node },
      {
        contenthash,
      },
    )
  }

  async getContentHash({ node }: NodeProps): Promise<Response | undefined> {
    const domain = await this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('domain.node = :node ', { node })
      .select(['domain.contenthash', 'domain.ttl'])
      .getOne()

    if (domain) return { value: domain.contenthash as string, ttl: domain.ttl }
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

  async getAddresses({ node }: NodeProps): Promise<Address[]> {
    return await this.client
      .getRepository(Address)
      .createQueryBuilder('address')
      .where('address.domain = :node ', { node })
      .andWhere('length(address.address) > 0')
      .getMany()
  }

  async getTexts({ node }: NodeProps): Promise<Text[]> {
    return await this.client
      .getRepository(Text)
      .createQueryBuilder('text')
      .where('text.domain = :node ', { node })
      .andWhere('text.key != :key', { key: 'pubkey' })
      .andWhere('text.key != :key', { key: 'ABI' })
      .andWhere('length(text.value) > 0')
      .getMany()
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
    await this.client.getRepository(Text).upsert(
      {
        key: 'pubkey',
        value: `(${x},${y})`,
        domain: node,
        resolver,
        resolverVersion,
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   * getPubkey reutilized the getText function with `pubkey` as a reserved key
   */
  async getPubkey({ node }: NodeProps): Promise<GetPubkeyResponse | undefined> {
    const pubkey = await this.getText({ node, key: 'pubkey' })
    if (!pubkey) return

    // extracting the X and Y values from a string (e.g (10,20) -> x = 10, y = 20)
    const [, x, y] = /\((0x\w+),(0x\w+)\)/g.exec(pubkey.value) || []
    return { value: { x, y }, ttl: pubkey.ttl }
  }

  async setAbi({ node, value, resolver, resolverVersion }: SetAbiProps) {
    await this.client.getRepository(Text).upsert(
      {
        key: 'ABI',
        value,
        domain: node,
        resolver,
        resolverVersion,
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   *  getABI reutilized the getText function with `ABI` as a reserved key
   */
  async getABI({ node }: NodeProps): Promise<Response | undefined> {
    return await this.getText({ node, key: 'ABI' })
  }
}
