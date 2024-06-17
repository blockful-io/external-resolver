import 'reflect-metadata'
import { DataSource } from 'typeorm'

import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
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
    await this.client.getRepository(Domain).insert({
      node,
      ttl,
      addresses: [],
      texts: [],
      owner,
    })
  }

  async transfer({ node, owner }: TransferDomainProps) {
    await this.client.getRepository(Domain).update(node, {
      owner,
    })
  }

  async getDomain({ node }: DomainProps): Promise<Domain | null> {
    return await this.client.getRepository(Domain).findOneBy({
      node,
    })
  }

  async setContentHash({ node, contenthash }: SetContentHashProps) {
    await this.client.getRepository(Domain).update(node, {
      contenthash,
    })
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
          domain: {
            node,
          },
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
      .innerJoin('addr.domain', 'domain')
      .where('addr.domain = :node ', { node })
      .andWhere('addr.coin = :coin', { coin })
      .select(['addr.address', 'domain.ttl'])
      .getOne()

    if (addr) return { value: addr.address, ttl: addr.domain.ttl }
  }

  async setText({ node, key, value }: SetTextProps) {
    await this.client.getRepository(Text).upsert(
      {
        key,
        value,
        domain: {
          node,
        },
      },
      { conflictPaths: ['domain', 'key'], skipUpdateIfNoValuesChanged: true },
    )
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const text = await this.client
      .getRepository(Text)
      .createQueryBuilder('text')
      .innerJoin('text.domain', 'domain')
      .where('text.domain = :node ', { node })
      .andWhere('text.key = :key', { key })
      .select(['text.value', 'domain.ttl'])
      .getOne()

    if (text) return { value: text.value, ttl: text.domain.ttl }
  }
}
