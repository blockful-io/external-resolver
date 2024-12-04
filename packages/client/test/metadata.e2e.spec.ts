import 'reflect-metadata'
import { assert, expect } from 'chai'
import { ApolloServer } from '@apollo/server'
import { DataSource } from 'typeorm'
import { ChildProcess, spawn } from 'child_process'
import { labelhash, namehash, normalize } from 'viem/ens'
import { anvil } from 'viem/chains'
import { createTestClient, http, publicActions, walletActions, Hex } from 'viem'
import {
  generatePrivateKey,
  privateKeyToAccount,
  privateKeyToAddress,
} from 'viem/accounts'

import { typeDefs, DomainMetadata } from '@blockful/gateway/src/types'
import { domainResolver } from '@blockful/gateway/src/resolvers'
import { PostgresRepository } from '@blockful/gateway/src/repositories'
import {
  Text,
  Domain,
  Address,
  Contenthash,
} from '@blockful/gateway/src/entities'
import { EthereumClient } from '@blockful/gateway/src/services'

import { deployContracts, setupGateway } from './helpers'

describe('Metadata API', () => {
  let repo: PostgresRepository,
    datasource: DataSource,
    server: ApolloServer,
    localNode: ChildProcess,
    dbResolver: Hex

  const owner = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  )

  const client = createTestClient({
    chain: anvil,
    mode: 'anvil',
    transport: http(),
  })
    .extend(publicActions)
    .extend(walletActions)

  before(async () => {
    localNode = spawn('anvil')

    const { registryAddr, registrarAddr, dbResolverAddr } =
      await deployContracts(owner.address)

    dbResolver = dbResolverAddr

    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './metadata.test.db',
      entities: [Text, Domain, Address, Contenthash],
      synchronize: true,
    })

    repo = new PostgresRepository(await datasource.initialize())

    const ethClient = new EthereumClient(client, registryAddr, registrarAddr)

    server = new ApolloServer({
      typeDefs,
      resolvers: {
        Query: {
          domain: async (_, name) =>
            await domainResolver({
              name,
              repo,
              client: ethClient,
              resolverAddress: dbResolverAddr,
            }),
        },
      },
    })

    setupGateway(
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      { repo },
      registryAddr,
      registrarAddr,
    )
  })

  beforeEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain', 'Contenthash']) {
      await datasource.getRepository(entity).clear()
    }
  })

  after(async () => {
    localNode.kill()
    await datasource.destroy()
  })

  describe('2LD properties', async () => {
    const name = normalize('l1domain.eth')
    const node = namehash(name)

    it('should fetch 2LD properties with no subdomains', async () => {
      const t1 = new Text()
      t1.domain = node
      t1.key = '1key'
      t1.value = '1value'
      t1.resolver = '0x1resolver'
      t1.resolverVersion = '1'
      await datasource.manager.save(t1)

      const t2 = new Text()
      t2.domain = node
      t2.key = '2key'
      t2.value = '2value'
      t2.resolver = '0x2resolver'
      t2.resolverVersion = '2'
      await datasource.manager.save(t2)

      const a1 = new Address()
      a1.domain = node
      a1.address = '0x1'
      a1.coin = '1'
      a1.resolver = '0x1resolver'
      a1.resolverVersion = '1'
      await datasource.manager.save(a1)

      const a2 = new Address()
      a2.domain = node
      a2.address = '0x2'
      a2.coin = '60'
      a2.resolver = '0x2resolver'
      a2.resolverVersion = '2'
      await datasource.manager.save(a2)

      const ch = new Contenthash()
      ch.domain = node
      ch.contenthash =
        'ipfs://QmYwWkU8H6x5xYz1234567890abcdefghijklmnopqrstuvwxyz'
      ch.resolver = '0x2resolver'
      ch.resolverVersion = '2'
      await datasource.manager.save(ch)

      const response = await server.executeOperation({
        query: `query Domain($name: String!) {
        domain(name: $name) {
          id
          context
          owner
          label
          labelhash
          parent
          parentNode
          name
          node
          resolvedAddress
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
          name,
        },
      })
      assert(response.body.kind === 'single')
      const actual = response.body.singleResult.data?.domain as DomainMetadata

      assert(actual !== null)
      expect(actual.id).equal(`${owner.address}-${node}`)
      expect(actual.context).equal(owner.address)
      expect(actual.owner).equal(owner.address)
      expect(actual.label).equal('l1domain')
      expect(actual.labelhash).equal(labelhash('l1domain'))
      expect(actual.parent).equal('eth')
      expect(actual.parentNode).equal(namehash('eth'))
      expect(actual.name).equal(name)
      expect(actual.node).equal(node)
      expect(actual.resolvedAddress).equal('0x2')
      expect(actual.subdomainCount).equal(0)
      expect(actual.resolver.id).equal(`${owner.address}-${node}`)
      expect(actual.resolver.node).equal(node)
      expect(actual.resolver.context).equal(owner.address)
      expect(actual.resolver.address).equal(dbResolver)
      expect(actual.resolver.addr).equal('0x2')
      expect(actual.resolver.contentHash).equal(
        'ipfs://QmYwWkU8H6x5xYz1234567890abcdefghijklmnopqrstuvwxyz',
      )
      expect(actual.resolver.texts).eql([
        {
          key: '1key',
          value: '1value',
        },
        {
          key: '2key',
          value: '2value',
        },
      ])
      expect(actual.resolver.addresses).eql([
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

    it('should fetch 2LD properties with subdomains', async () => {
      const d = new Domain()
      d.name = 'd1.public.eth'
      d.node = namehash('d1')
      d.ttl = '300'
      d.parent = node
      d.resolver = '0xresolver'
      d.resolverVersion = '1'
      d.owner = privateKeyToAddress(generatePrivateKey())
      await datasource.manager.save(d)

      const t = new Text()
      t.key = '1key'
      t.value = '1value'
      t.domain = d.node
      t.resolver = '0x1resolver'
      t.resolverVersion = '1'
      t.createdAt = new Date()
      t.updatedAt = new Date()
      await datasource.manager.save(t)

      const a = new Address()
      a.address = '0x1'
      a.coin = '60'
      a.domain = d.node
      a.resolver = '0x1resolver'
      a.resolverVersion = '1'
      a.createdAt = new Date()
      a.updatedAt = new Date()
      await datasource.manager.save(a)

      const ch = new Contenthash()
      ch.domain = d.node
      ch.contenthash =
        'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450'
      ch.resolver = '0x1resolver'
      ch.resolverVersion = '1'
      await datasource.manager.save(ch)

      const response = await server.executeOperation({
        query: `query Domain($name: String!) {
        domain(name: $name) {
          subdomains {
            id
            context
            owner
            name
            node
            label
            labelhash
            parent
            parentNode
            resolvedAddress
            resolver {
              id
              node
              context
              address
              addr
              contentHash
              texts {
                key
                value
              }
              addresses {
                address
                coin
              }
            }
            expiryDate
            registerDate
          }
          subdomainCount
        }
      }`,
        variables: {
          name,
        },
      })
      assert(response.body.kind === 'single')
      const actual = response.body.singleResult.data?.domain as DomainMetadata

      assert(actual !== null)
      expect(actual.subdomainCount).equal(1)
      assert(actual.subdomains != null)
      const subdomain = actual.subdomains[0]
      expect(subdomain).to.have.property('id', `${d.owner}-${d.node}`)
      expect(subdomain).to.have.property('context', d.owner)
      expect(subdomain).to.have.property('owner', d.owner)
      expect(subdomain).to.have.property('name', d.name)
      expect(subdomain).to.have.property('label', 'd1')
      expect(subdomain).to.have.property('labelhash', labelhash('d1'))
      expect(subdomain).to.have.property('parent', 'public.eth')
      expect(subdomain).to.have.property('parentNode', namehash('public.eth'))
      expect(subdomain).to.have.property('node', d.node)
      expect(subdomain).to.have.property('resolvedAddress', '0x1')
      expect(subdomain.resolver).to.have.property('id', `${d.owner}-${d.node}`)
      expect(subdomain.resolver).to.have.property('node', d.node)
      expect(subdomain.resolver).to.have.property('context', d.owner)
      expect(subdomain.resolver).to.have.property('address', d.resolver)
      expect(subdomain.resolver).to.have.property('addr', '0x1')
      expect(subdomain.resolver).to.have.property('contentHash', ch.contenthash)
      expect(subdomain.resolver.texts).to.eql([{ key: t.key, value: t.value }])
      expect(subdomain.resolver.addresses).to.eql([
        { address: a.address, coin: a.coin },
      ])
    })
  })
})
