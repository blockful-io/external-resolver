import 'reflect-metadata'
import { DataSource } from 'typeorm'

import {
  Response,
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
    await this.client.getRepository(Domain).upsert(
      [
        {
          node,
          contenthash,
        },
      ],
      {
        conflictPaths: ['namehash'],
      },
    )
  }

  async contentHash({ node }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Domain)
    const domain = await repo.findOneBy({
      node,
    })

    if (!domain || !domain.contenthash) return

    return { value: domain.contenthash }
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

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Address)
    const addr = await repo.findOneBy({
      domain: {
        node,
      },
      coin,
    })

    if (!addr) return

    return { value: addr.address }
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

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Text)
    const text = await repo.findOneBy({
      domain: {
        node,
      },
      key,
    })

    if (!text) return

    return { value: text.value }
  }
}
