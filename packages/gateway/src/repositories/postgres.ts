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
  GetPubkeyProps,
  GetPubkeyResponse,
  SetAbiProps,
  GetAbiProps,
  DomainProps,
  TransferDomainProps,
  RegisterDomainProps,
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

  async register({ node, ttl, owner }: RegisterDomainProps) {
    await this.client.getRepository(Domain).upsert(
      [
        {
          node,
          ttl,
          owner,
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

  async getDomain({ node }: DomainProps): Promise<Domain | null> {
    return await this.client.getRepository(Domain).findOneBy({
      node,
    })
  }

  async setContentHash({ node, contenthash }: SetContentHashProps) {
    await this.client.getRepository(Domain).update(
      { node },
      {
        contenthash,
      },
    )
  }

  async getContentHash({
    node,
  }: GetAddressProps): Promise<Response | undefined> {
    const domain = await this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('domain.node = :node ', { node })
      .select(['domain.contenthash', 'domain.ttl'])
      .getOne()

    if (domain) return { value: domain.contenthash as string, ttl: domain.ttl }
  }

  async setAddr({ node, addr: address, coin }: SetAddressProps) {
    await this.client.getRepository(Address).upsert(
      [
        {
          domain: node,
          address,
          coin,
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

  async setText({ node, key, value }: SetTextProps) {
    await this.client.getRepository(Text).upsert(
      {
        key,
        value,
        domain: node,
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

  async setPubkey({ node, x, y }: SetPubkeyProps) {
    await this.client.getRepository(Text).upsert(
      {
        key: 'pubkey',
        value: `(${x},${y})`,
        domain: node,
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   * getPubkey reutilized the getText function with `pubkey` as a reserved key
   */
  async getPubkey({
    node,
  }: GetPubkeyProps): Promise<GetPubkeyResponse | undefined> {
    const pubkey = await this.getText({ node, key: 'pubkey' })
    if (!pubkey) return

    // extracting the X and Y values from a string (e.g (10,20) -> x = 10, y = 20)
    const [, x, y] = /\((0x\w+),(0x\w+)\)/g.exec(pubkey.value) || []
    return { value: { x, y }, ttl: pubkey.ttl }
  }

  async setAbi({ node, value }: SetAbiProps) {
    await this.client.getRepository(Text).upsert(
      {
        key: 'ABI',
        value,
        domain: node,
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  /**
   *  getABI reutilized the getText function with `ABI` as a reserved key
   */
  async getABI({ node }: GetAbiProps): Promise<Response | undefined> {
    return await this.getText({ node, key: 'ABI' })
  }
}
