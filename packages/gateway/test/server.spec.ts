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
  withSetText,
} from '../src/handlers'
import { TypeORMRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('Gateway', () => {
  let repo: TypeORMRepository
  let datasource: DataSource
  let domain: Domain

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new TypeORMRepository(await datasource.initialize())
  })

  beforeEach(async () => {
    domain = new Domain()
    domain.namehash = namehash('public.eth')
    domain.ttl = 40
    await datasource.manager.save(domain)
  })

  afterEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      await datasource.getRepository(entity).clear()
    }
  })

  describe('Text', () => {
    it('should handle request for set new text', async () => {
      const server = NewServer(withSetText(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setText',
        domain.namehash,
        'avatar',
        'blockful.png',
      )

      expect(result.length).toEqual(1)
      const [value] = result
      expect(value).toEqual('blockful.png')

      const text = await datasource.getRepository(Text).findOne({
        relations: ['domain'],
        where: {
          key: 'avatar',
          domain: {
            namehash: domain.namehash,
          },
        },
      })
      expect(text?.key).toEqual('avatar')
      expect(text?.value).toEqual('blockful.png')
      expect(text?.domain.namehash).toEqual(domain.namehash)
    })

    it('should handle request for update text', async () => {
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
        domain.namehash,
        'avatar',
        'ethereum.png',
      )

      expect(result.length).toEqual(1)
      const [value] = result
      expect(value).toEqual('ethereum.png')

      const updatedText = await datasource.getRepository(Text).findOne({
        relations: ['domain'],
        where: {
          key: 'avatar',
          domain: {
            namehash: domain.namehash,
          },
        },
      })
      expect(updatedText?.key).toEqual('avatar')
      expect(updatedText?.value).toEqual('ethereum.png')
      expect(updatedText?.domain.namehash).toEqual(domain.namehash)
    })

    it('should handle GET request for text', async () => {
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      await datasource.manager.save(text)

      const server = NewServer(withGetText(repo))

      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'text',
        domain.namehash,
        'avatar',
      )

      expect(result.length).toEqual(1)
      const [avatar] = result
      expect(avatar).toEqual('blockful.png')
    })
  })

  describe('Address', () => {
    // TODO: test multicoin read/write when issue is solved: https://github.com/smartcontractkit/ccip-read/issues/32

    it('should handle set request for setAddr on ethereum', async () => {
      const server = NewServer(withSetAddr(repo))
      const result = await doCall(
        server,
        abi,
        TEST_ADDRESS,
        'setAddr',
        domain.namehash,
        '0x1234567890123456789012345678901234567890',
      )

      expect(result.length).toEqual(1)
      const [value] = result
      expect(value).toEqual('0x1234567890123456789012345678901234567890')

      const addr = await datasource.getRepository(Address).findOne({
        relations: ['domain'],
        where: {
          domain: {
            namehash: domain.namehash,
          },
          coin: 60,
        },
      })
      expect(addr?.address).toEqual(
        '0x1234567890123456789012345678901234567890',
      )
      expect(addr?.coin).toEqual(60)
      expect(addr?.domain.namehash).toEqual(domain.namehash)
    })

    it('should handle GET request for addr on ethereum', async () => {
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
        domain.namehash,
      )

      expect(result.length).toEqual(1)
      const [value] = result
      expect(value).toEqual('0x1234567890123456789012345678901234567890')
    })
  })
})
