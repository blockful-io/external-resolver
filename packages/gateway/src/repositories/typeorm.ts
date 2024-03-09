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

    return { value: domain.contenthash, ttl: domain.ttl }
  }

  async contentHash({ node }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Domain)
    const domain = await repo.findOneBy({
      namehash: node,
    })

    if (!domain) return

    return { value: domain.contenthash, ttl: domain.ttl }
  }

  async setAddr({
    node,
    addr: address,
    coin,
  }: SetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Address)
    const addr = await repo.findOneBy({
      domainHash: node,
      address,
      coin,
    })

    if (!addr) return

    addr.address = address
    await repo.save(addr)

    return { value: addr.address, ttl: addr.ttl }
  }

  async addr({ node, coin }: GetAddressProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Address)
    const addr = await repo.findOneBy({
      domainHash: node,
      coin,
    })

    if (!addr) return

    return { value: addr.address, ttl: addr.ttl }
  }

  async setText({
    node,
    key,
    value,
  }: SetTextProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Text)
    const text = await repo.findOneBy({
      domainHash: node,
      key,
    })

    if (!text) return

    text.value = value
    await repo.save(text)

    return { value: text.value, ttl: text.ttl }
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    const repo = this.client.getRepository(Text)
    const text = await repo.findOneBy({
      domainHash: node,
      key,
    })

    if (!text) return

    return { value: text.value, ttl: text.ttl }
  }
}
