/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  beforeEach,
  assert,
} from 'vitest'
import { namehash } from 'viem/ens'
import { Hex, labelhash } from 'viem'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'

import { PostgresRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'
import { DomainMetadata, typeDefs } from '../src/types'
import { ApolloServer } from '@apollo/server'
import { domainResolver } from '../src/resolvers'

describe('Metadata API', () => {
  let repo: PostgresRepository,
    datasource: DataSource,
    server: ApolloServer,
    domain: Domain,
    pvtKey: `0x${string}`

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './metadata.test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
    const client = new DummyClient()
    server = new ApolloServer({
      typeDefs,
      resolvers: {
        Query: {
          domain: async (_, name) =>
            await domainResolver(name, repo, client, '0xresolver'),
        },
      },
    })
  })

  beforeEach(async () => {
    pvtKey = generatePrivateKey()
    const node = namehash('public.eth')
    domain = new Domain()
    domain.name = 'public.eth'
    domain.node = node
    domain.ttl = 300
    domain.parent = namehash('eth')
    domain.resolver = '0xresolver'
    domain.resolverVersion = '1'
    domain.contenthash = {
      contentHash: '0xcontenthash',
      resolver: '0xresolver',
      resolverVersion: '1',
      domain: node,
    }
    domain.owner = privateKeyToAddress(pvtKey)
    domain.texts = [
      {
        domain: node,
        key: '1key',
        value: '1value',
        resolver: '0x1resolver',
        resolverVersion: '1',
      },
      {
        domain: node,
        key: '2key',
        value: '2value',
        resolver: '0x2resolver',
        resolverVersion: '2',
      },
    ]
    domain.addresses = [
      {
        address: '0x1',
        coin: '1',
        domain: node,
        resolver: '0x1resolver',
        resolverVersion: '1',
      },
      {
        address: '0x2',
        coin: '60',
        domain: node,
        resolver: '0x2resolver',
        resolverVersion: '2',
      },
    ]
    domain = await datasource.manager.save(domain)
  })

  afterEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      await datasource.getRepository(entity).clear()
    }
  })

  it('should read domain from db with no subdomains', async () => {
    const response = await server.executeOperation({
      query: `query Domain($name: String!) {
          domain(name: $name) {
            id
            context
            owner
            label
            labelhash
            name
            namehash
            parent
            parentHash
            resolvedAddress
            subdomains
            subdomainCount
            resolver {
              id
              node
              addr
              address
              contentHash
              context
              texts {
                key
                value
              }
              addresses {
                address
                coin
              }
            }
          }
        }`,
      variables: {
        name: domain.name,
      },
    })
    assert(response.body.kind === 'single')
    const actual = response.body.singleResult.data?.domain as DomainMetadata

    assert(actual != null)
    expect(actual.id).toEqual(`${domain.owner}-${domain.node}`)
    expect(actual.context).toEqual(domain.owner)
    expect(actual.owner).toEqual(domain.owner)
    expect(actual.label).toEqual('public')
    expect(actual.labelhash).toEqual(labelhash('public'))
    expect(actual.name).toEqual(domain.name)
    expect(actual.namehash).toEqual(domain.node)
    expect(actual.parent).toEqual('eth')
    expect(actual.parentHash).toEqual(namehash('eth'))
    expect(actual.resolvedAddress).toEqual(domain.resolver)
    expect(actual.subdomains).toEqual([])
    expect(actual.subdomainCount).toEqual(0)
    expect(actual.resolver.id).toEqual(`${domain.owner}-${domain.node}`)
    expect(actual.resolver.node).toEqual(domain.node)
    expect(actual.resolver.context).toEqual(domain.owner)
    expect(actual.resolver.address).toEqual(domain.resolver)
    expect(actual.resolver.addr).toEqual('0x2')
    expect(actual.resolver.contentHash).toEqual(domain.contenthash)
    expect(actual.resolver.texts).toEqual([
      {
        key: '1key',
        value: '1value',
      },
      {
        key: '2key',
        value: '2value',
      },
    ])
    expect(actual.resolver.addresses).toEqual([
      {
        address: '0x1',
        coin: '1',
      },
      {
        address: '0x2',
        coin: '60',
      },
    ])
  })

  it('should read domain from db with 1 subdomain', async () => {
    const node = namehash('d1.public.eth')
    let d = new Domain()
    d.name = 'd1.public.eth'
    d.node = node
    d.ttl = 300
    d.parent = namehash('public.eth')
    d.resolver = '0xresolver'
    d.resolverVersion = '1'
    d.owner = privateKeyToAddress(generatePrivateKey())
    d = await datasource.manager.save(d)

    const response = await server.executeOperation({
      query: `query Domain($name: String!) {
          domain(name: $name) {
            subdomains
            subdomainCount
          }
        }`,
      variables: {
        name: domain.name,
      },
    })
    assert(response.body.kind === 'single')
    expect(response.body.singleResult.errors).toBeUndefined()
    const actual = response.body.singleResult.data?.domain as DomainMetadata

    assert(actual != null)
    expect(actual.subdomainCount).toEqual(1)
    expect(actual.subdomains).toEqual([d.name])
  })
})

class DummyClient {
  async getOwner(_: Hex): Promise<Hex> {
    return '0x'
  }

  async getResolver(_: Hex): Promise<Hex | undefined> {
    return '0x'
  }

  async getExpireDate(_: Hex): Promise<string> {
    return '0'
  }
}
