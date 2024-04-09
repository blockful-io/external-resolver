/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { hash as namehash } from 'eth-ens-namehash'

import { doCall } from './helper'
import { NewServer, abi } from '../src/server'
import {
  withGetAddr,
  withGetText,
  withSetAddr,
  withSetContentHash,
  withGetContentHash,
  withSetText,
} from '../src/handlers'
import { PostgresRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('Gateway Database', () => {
  let repo: PostgresRepository, datasource: DataSource, domain: Domain

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
  })

  beforeEach(async () => {
    domain = new Domain()
    domain.node = namehash('public.eth')
    domain.ttl = 2000
    await datasource.manager.save(domain)
  })

  afterEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      await datasource.getRepository(entity).clear()
    }
  })

  describe('Domain', () => {
    it('should set new contenthash', async () => {
      const contenthash =
        '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful
      const server = NewServer(withSetContentHash(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setContenthash',
        domain.node,
        contenthash,
      )

      expect(result.data.length).toEqual(0)

      const d = await datasource.getRepository(Domain).findOneBy({
        node: domain.node,
        contenthash,
      })
      expect(d).not.toBeNull()
      expect(d?.node).toEqual(domain.node)
      expect(d?.contenthash).toEqual(contenthash)
    })

    it('should query contenthash', async () => {
      const content =
        '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909'
      domain.contenthash = content
      await datasource.manager.save(domain)

      const server = NewServer(withGetContentHash(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'contenthash',
        domain.node,
      )

      expect(result.data.length).toEqual(1)
      const [value] = result.data
      expect(value).toEqual(content)
      expect(result.ttl).toEqual(domain.ttl)
    })

    it('should set new contenthash on invalid domain', async () => {
      const contenthash =
        '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful
      const server = NewServer(withSetContentHash(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setContenthash',
        namehash('0xiiiiii'),
        contenthash,
      )

      expect(result.data.length).toEqual(0)
    })
  })

  describe('Text', () => {
    it('should set new text', async () => {
      const server = NewServer(withSetText(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setText',
        domain.node,
        'avatar',
        'blockful.png',
      )

      expect(result.data.length).toEqual(0)

      const text = await datasource.getRepository(Text).findOne({
        relations: ['domain'],
        where: {
          key: 'avatar',
          domain: {
            node: domain.node,
          },
        },
      })
      expect(text?.key).toEqual('avatar')
      expect(text?.value).toEqual('blockful.png')
      expect(text?.domain.node).toEqual(domain.node)
    })

    it('should update text', async () => {
      const server = NewServer(withSetText(repo))
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      await datasource.manager.save(text)

      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setText',
        domain.node,
        'avatar',
        'ethereum.png',
      )

      expect(result.data.length).toEqual(0)

      const updatedText = await datasource.getRepository(Text).findOne({
        relations: ['domain'],
        where: {
          key: 'avatar',
          domain: {
            node: domain.node,
          },
        },
      })
      expect(updatedText?.key).toEqual('avatar')
      expect(updatedText?.value).toEqual('ethereum.png')
      expect(updatedText?.domain.node).toEqual(domain.node)
    })

    it('should query text', async () => {
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      text.domain = domain
      await datasource.manager.save(text)

      const server = NewServer(withGetText(repo))

      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'text',
        domain.node,
        'avatar',
      )

      expect(result.data.length).toEqual(1)
      const [avatar] = result.data
      expect(avatar).toEqual('blockful.png')
      expect(result.ttl).toEqual(domain.ttl)
    })
  })

  describe('Address', () => {
    // TODO: test multicoin read/write when issue is solved: https://github.com/smartcontractkit/ccip-read/issues/32

    it('should set ethereum address', async () => {
      const server = NewServer(withSetAddr(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setAddr',
        domain.node,
        '0x1234567890123456789012345678901234567890',
      )

      expect(result.data.length).toEqual(0)

      const addr = await datasource.getRepository(Address).findOne({
        relations: ['domain'],
        where: {
          domain: {
            node: domain.node,
          },
          coin: 60,
        },
      })
      expect(addr?.address).toEqual(
        '0x1234567890123456789012345678901234567890',
      )
      expect(addr?.coin).toEqual(60)
      expect(addr?.domain.node).toEqual(domain.node)
    })

    it('should query ethereum address', async () => {
      const addr = new Address()
      addr.coin = 60
      addr.address = '0x1234567890123456789012345678901234567890'
      addr.domain = domain
      await datasource.manager.save(addr)

      const server = NewServer(withGetAddr(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'addr',
        domain.node,
      )

      expect(result.data.length).toEqual(1)
      const [value] = result.data
      expect(value).toEqual('0x1234567890123456789012345678901234567890')
      expect(result.ttl).toEqual(domain.ttl)
    })
  })
})
