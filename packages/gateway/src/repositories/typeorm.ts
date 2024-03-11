import 'reflect-metadata'

import {
  SetAddressProps,
  SetTextProps,
  GetTextProps,
  Response,
  GetAddressProps,
  SetContentHashProps,
} from '../types'
import { DataSource } from 'typeorm'
import { Address, Text, Domain } from '../entities'

export class TypeORMRepository {
  private client: DataSource

  constructor(client: DataSource) {
    this.client = client
  }

  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Domain)
    const domain = await repo.findOneBy({
      namehash: node,
    })

    if (!domain) return

    domain.contenthash = contenthash
    await repo.save(domain)

    return { value: domain.contenthash }
  }

  async contentHash({ node }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Domain)
    const domain = await repo.findOneBy({
      namehash: node,
    })

    if (!domain || !domain.contenthash) return

    return { value: domain.contenthash }
  }

  async setAddr({
    node,
    addr: address,
    coin,
  }: SetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Address)
    const addr = await repo.upsert(
      [
        {
          domain: {
            namehash: node,
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

    if (!addr) return

    return { value: address }
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Address)
    const addr = await repo.findOneBy({
      domain: {
        namehash: node,
      },
      coin,
    })

    if (!addr) return

    return { value: addr.address }
  }

  async setText({
    node,
    key,
    value,
  }: SetTextProps): Promise<Response | undefined> {
    const textRepo = this.client.getRepository(Text)
    const text = await textRepo.upsert(
      [
        {
          key,
          value,
          domain: {
            namehash: node,
          },
        },
      ],
      {
        conflictPaths: ['domain.namehash', 'key'],
        skipUpdateIfNoValuesChanged: true,
      },
    )

    if (!text) return

    return { value }
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Text)
    const text = await repo.findOneBy({
      domain: {
        namehash: node,
      },
      key,
    })

    if (!text) return

    return { value: text.value }
  }
}
