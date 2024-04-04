import 'reflect-metadata'
import { DataSource } from 'typeorm'

import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
} from '../types'
import { Address, Text, Domain } from '../entities'

export class TypeORMRepository {
  private client: DataSource

  constructor(client: DataSource) {
    this.client = client
  }

  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<void> {
    await this.client.getRepository(Domain).update(node, {
      contenthash,
    })
  }

  async contentHash({
    node,
  }: GetAddressProps): Promise<`0x${string}` | undefined> {
    const domain = await this.client
      .getRepository(Domain)
      .createQueryBuilder('domain')
      .where('domain.node = :node ', { node })
      .select('domain.contenthash')
      .getOne()

    return domain?.contenthash
  }

  async setAddr({ node, addr: address, coin }: SetAddressProps): Promise<void> {
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

  async getAddr({ node, coin }: GetAddressProps): Promise<string | undefined> {
    const addr = await this.client
      .getRepository(Address)
      .createQueryBuilder('addr')
      .where('addr.domain = :node ', { node })
      .andWhere('addr.coin = :coin', { coin })
      .select('addr.address')
      .getOne()

    return addr?.address
  }

  async setText({ node, key, value }: SetTextProps): Promise<void> {
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

  async getText({ node, key }: GetTextProps): Promise<string | undefined> {
    const text = await this.client
      .getRepository(Text)
      .createQueryBuilder('text')
      .where('text.domain = :node ', { node })
      .andWhere('text.key = :key', { key })
      .select('text.value')
      .getOne()

    return text?.value
  }
}
