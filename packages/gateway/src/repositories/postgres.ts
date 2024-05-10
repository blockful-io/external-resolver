import 'reflect-metadata'
import { DataSource } from 'typeorm'

import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
} from '../types'
import { Address, Text, Domain } from '../entities'

/* The PostgresRepository class provides methods for setting and getting content
hash, address, and text data in a PostgreSQL database. */
export class PostgresRepository {
  private client: DataSource

  constructor(client: DataSource) {
    this.client = client
  }

  async register({ node, ttl }: Pick<Domain, 'node' | 'ttl'>) {
    await this.client
      .getRepository(Domain)
      .insert({ node, ttl, addresses: [], texts: [] })
  }

  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<void> {
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

    if (!domain) return
    return { value: domain.contenthash as string, ttl: domain.ttl }
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
        conflictPaths: ['coin'],
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

    if (!addr) return
    return { value: addr.address, ttl: addr.domain.ttl }
  }

  async setText({ node, key, value }: SetTextProps) {
    await this.client.getRepository(Text).upsert(
      [
        {
          key,
          value,
          domain: {
            node,
          },
        },
      ],
      {
        conflictPaths: ['key'],
        skipUpdateIfNoValuesChanged: true,
      },
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

    if (!text) return
    return { value: text.value, ttl: text.domain.ttl }
  }
}
