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
import * as ccip from '@blockful/ccip-server'

import { doCall } from './helper'
import { abi } from '../src/abi'
import {
  withGetAddr,
  withGetText,
  withSetAddr,
  withSetContentHash,
  withGetContentHash,
  withSetText,
  withRegisterDomain,
  withTransferDomain,
} from '../src/handlers'
import { PostgresRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'
import { OwnershipValidator, formatTTL } from '../src/services'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('Gateway Database', () => {
  let repo: PostgresRepository,
    datasource: DataSource,
    validator: OwnershipValidator

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
    validator = new OwnershipValidator(repo)
  })

  afterEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      await datasource.getRepository(entity).clear()
    }
  })

  describe('Domain', () => {
    describe('Register Domain', () => {
      it('should create new domain', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const node = namehash('blockful.eth')
        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo, validator))
        await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [node, 300],
        })

        const d = await datasource.getRepository(Domain).findOneBy({
          node,
          owner,
        })
        expect(d).not.toBeNull()
        expect(d?.ttl).toEqual(300)
      })

      // Register a domain 'public.eth' with a given TTL, then attempt to register the same domain with a different TTL
      it('should block duplicated domains', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const domain = new Domain()
        domain.node = namehash('public.eth')
        domain.ttl = 300
        domain.owner = owner
        await datasource.manager.save(domain)

        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo, validator))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [domain.node, 400],
        })

        expect(result.data.length).toEqual(0)
        expect(result.error).toEqual('Domain already exists')

        const d = await datasource.getRepository(Domain).countBy({
          node: domain.node,
          owner,
        })
        expect(d).toEqual(1)
      })
    })

    describe('Transfer Domain', () => {
      it('should transfer existing domain', async () => {
        const pvtKey = generatePrivateKey()
        const node = namehash('blockful.eth')
        const domain = new Domain()
        domain.node = node
        domain.ttl = 300
        domain.owner = privateKeyToAddress(pvtKey)
        await datasource.manager.save(domain)

        const expectedOwner = privateKeyToAddress(generatePrivateKey())

        const server = new ccip.Server()
        server.add(abi, withTransferDomain(repo, validator))
        await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'transfer',
          pvtKey,
          args: [node, expectedOwner],
        })

        const changedDomain = await datasource.getRepository(Domain).existsBy({
          node,
          owner: expectedOwner,
        })
        expect(changedDomain).toBe(true)

        const prevDomain = await datasource.getRepository(Domain).existsBy({
          node,
          owner: domain.owner,
        })
        expect(prevDomain).toBe(false)
      })

      it('should handle transferring domain not found', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const node = namehash('blockful.eth')

        const server = new ccip.Server()
        server.add(abi, withTransferDomain(repo, validator))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'transfer',
          pvtKey,
          args: [node, owner],
        })

        expect(result.error).toEqual('Unauthorized')

        const changedDomain = await datasource.getRepository(Domain).existsBy({
          node,
          owner,
        })
        expect(changedDomain).toBe(false)
      })
    })

    describe('Content hash', () => {
      // Register a domain 'public.eth', then set a content hash for it
      it('should set new contenthash', async () => {
        const pvtKey = generatePrivateKey()
        const domain = new Domain()
        domain.node = namehash('public.eth')
        domain.ttl = 300
        domain.owner = privateKeyToAddress(pvtKey)
        await datasource.manager.save(domain)

        const contenthash =
          '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful
        const server = new ccip.Server()
        server.add(abi, withSetContentHash(repo, validator))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'setContenthash',
          pvtKey,
          args: [domain.node, contenthash],
        })

        expect(result.data.length).toEqual(0)

        const d = await datasource.getRepository(Domain).findOneBy({
          node: domain.node,
          contenthash,
        })
        expect(d).not.toBeNull()
        expect(d?.node).toEqual(domain.node)
        expect(d?.contenthash).toEqual(contenthash)
      })

      // Register a domain 'public.eth' with a content hash, then query for it
      it('should query contenthash', async () => {
        const domain = new Domain()
        domain.node = namehash('public.eth')
        domain.ttl = 300
        domain.owner = privateKeyToAddress(generatePrivateKey())
        await datasource.manager.save(domain)
        const content =
          '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909'
        domain.contenthash = content
        await datasource.manager.save(domain)

        const server = new ccip.Server()
        server.add(abi, withGetContentHash(repo))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'contenthash',
          args: [domain.node],
        })

        expect(result.data.length).toEqual(1)
        const [value] = result.data
        expect(value).toEqual(content)
        expect(parseInt(result.ttl!)).toBeCloseTo(
          parseInt(formatTTL(domain.ttl)),
        )
      })

      // Attempt to set a content hash for an invalid domain
      it('should set new contenthash on invalid domain', async () => {
        const contenthash =
          '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful
        const server = new ccip.Server()
        server.add(abi, withSetContentHash(repo, validator))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'setContenthash',
          args: [namehash('0xiiiiii'), contenthash],
        })

        expect(result.data.length).toEqual(0)
      })
    })
  })

  describe('Text', () => {
    let domain: Domain, pvtKey: `0x${string}`

    beforeEach(async () => {
      domain = new Domain()
      domain.node = namehash('public.eth')
      domain.ttl = 300
      pvtKey = generatePrivateKey()
      domain.owner = privateKeyToAddress(pvtKey)
      domain = await datasource.manager.save(domain)
    })

    // Register a domain, set an initial text record, then update it with a new value
    it('should set new text', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey,
        args: [domain.node, 'avatar', 'blockful.png'],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'avatar' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.key).toEqual('avatar')
      expect(actual[0]?.value).toEqual('blockful.png')
    })

    // Register a domain, set an initial text record, then update it with a new value
    it('should allow only 1 key same per domain', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      text.domain = domain
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey,
        args: [domain.node, 'avatar', 'floripa.png'],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'avatar' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toEqual(1)
      expect(actual[0]?.key).toEqual('avatar')
      expect(actual[0]?.value).toEqual('floripa.png')
    })

    // Register a domain, set an initial text record, then update it with a new value
    it('should update text', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      text.domain = domain
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey,
        args: [domain.node, 'avatar', 'ethereum.png'],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'avatar' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.key).toEqual('avatar')
      expect(actual[0]?.value).toEqual('ethereum.png')
    })

    // Attempt to set a text record using an unauthorized private key
    it('should not allow unauthorized users to set text', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const unauthorizedPvtKey = generatePrivateKey() // generate a different private key
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey: unauthorizedPvtKey,
        args: [domain.node, 'avatar', 'unauthorized.png'],
      })

      expect(result.error).toEqual('Unauthorized')
      const exists = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'avatar' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getExists()
      expect(exists).toBeFalsy()
    })

    // Register a domain with a text record, then query for it
    it('should query text', async () => {
      const text = new Text()
      text.key = 'avatar'
      text.value = 'blockful.png'
      text.domain = domain
      domain.owner = privateKeyToAddress(generatePrivateKey())
      await datasource.manager.save(text)

      const server = new ccip.Server()
      server.add(abi, withGetText(repo))

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'text',
        args: [domain.node, 'avatar'],
      })

      expect(result.data.length).toEqual(1)
      const [avatar] = result.data
      expect(avatar).toEqual('blockful.png')
      expect(parseInt(result.ttl!)).toBeCloseTo(
        parseInt(formatTTL(domain.ttl)),
        2,
      )
    })
  })

  describe('Address', () => {
    let domain: Domain, pvtKey: `0x${string}`

    beforeEach(async () => {
      domain = new Domain()
      domain.node = namehash('public.eth')
      domain.ttl = 300
      pvtKey = generatePrivateKey()
      domain.owner = privateKeyToAddress(pvtKey)
      await datasource.manager.save(domain)
    })

    // TODO: test multicoin read/write when issue is solved: https://github.com/smartcontractkit/ccip-read/issues/32

    // Register a domain, then set an Ethereum address for it
    it('should set ethereum address', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetAddr(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setAddr',
        pvtKey,
        args: [domain.node, '0x1234567890123456789012345678901234567890'],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Address)
        .createQueryBuilder()
        .where('coin = :coin', { coin: 60 })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.address).toEqual(
        '0x1234567890123456789012345678901234567890',
      )
      expect(actual[0]?.coin).toEqual('60')
    })

    // Register a domain, then set an Ethereum address for it
    it('should allow multiple addresses for same owner and different coins', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetAddr(repo, validator))
      const addr = new Address()
      addr.address = TEST_ADDRESS
      addr.coin = '1'
      addr.domain = domain
      await datasource.manager.save(addr)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setAddr',
        pvtKey,
        args: [domain.node, '0x1234567890123456789012345678901234567999'],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Address)
        .createQueryBuilder()
        .where('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(2)
      expect(actual[0]?.address).toEqual(
        '0x1234567890123456789012345678901234567890',
      )
      expect(actual[0]?.coin).toEqual('1')
      expect(actual[1]?.address).toEqual(
        '0x1234567890123456789012345678901234567999',
      )
      expect(actual[1]?.coin).toEqual('60')
    })

    // Attempt to set an Ethereum address using an unauthorized private key
    it('should not allow unauthorized users to set ethereum address', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetAddr(repo, validator))
      const unauthorizedPvtKey = generatePrivateKey() // generate a different private key
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setAddr',
        pvtKey: unauthorizedPvtKey,
        args: [domain.node, '0x1234567890123456789012345678901234567890'],
      })

      expect(result.error).toEqual('Unauthorized')

      const exists = await datasource
        .getRepository(Address)
        .createQueryBuilder()
        .where('coin = :coin', { coin: 60 })
        .andWhere('domain = :domain', { domain: domain.node })
        .getExists()

      expect(exists).toBeFalsy() // The address should not be set
    })

    // Register a domain with an Ethereum address, then query for it
    it('should query ethereum address', async () => {
      const addr = new Address()
      addr.coin = '60'
      addr.address = '0x1234567890123456789012345678901234567890'
      addr.domain = domain
      await datasource.manager.save(addr)

      const server = new ccip.Server()
      server.add(abi, withGetAddr(repo))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'addr',
        args: [domain.node],
      })

      expect(result.data.length).toEqual(1)
      const [value] = result.data
      expect(value).toEqual('0x1234567890123456789012345678901234567890')
      expect(parseInt(result.ttl!)).toBeCloseTo(parseInt(formatTTL(domain.ttl)))
    })
  })
})
