/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
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

    const domainRepo = datasource.getRepository(Domain)
    domain = new Domain()
    domain.namehash = namehash('public.eth')
    domain.ttl = 40
    await domainRepo.save(domain)
  })

  afterEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      const repository = datasource.getRepository(entity)
      await repository.clear() // Clear each entity table's content
    }
  })

  describe('Text', () => {
    it('should handle set request for setText', async () => {
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
    })

    it('should handle GET request for text', async () => {
      const textRepo = datasource.getRepository(Text)
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      text.domain = domain
      await textRepo.save(text)

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
    })

    it('should handle GET request for addr on ethereum', async () => {
      const addrRepo = datasource.getRepository(Address)
      const addr = new Address()
      addr.coin = 60
      addr.address = '0x1234567890123456789012345678901234567890'
      addr.domain = domain
      await addrRepo.save(addr)

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
