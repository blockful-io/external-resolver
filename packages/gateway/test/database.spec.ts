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
import * as ccip from '@blockful/ccip-server'
import {
  Hex,
  encodeFunctionData,
  pad,
  parseAbi,
  stringToHex,
  toHex,
  zeroHash,
} from 'viem'
import { namehash, packetToBytes } from 'viem/ens'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'

import { doCall } from './helper'
import { abi } from '../src/abi'
import {
  withGetAddr,
  withGetText,
  withSetAddr,
  withSetText,
  withSetContentHash,
  withGetContentHash,
  withSetAbi,
  withGetAbi,
  withSetPubkey,
  withGetPubkey,
  withRegisterDomain,
  withTransferDomain,
} from '../src/handlers'
import { PostgresRepository } from '../src/repositories'
import { Address, Text, Domain, Contenthash } from '../src/entities'
import {
  OwnershipValidator,
  SignatureRecover,
  formatTTL,
} from '../src/services'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('Gateway Database', () => {
  let repo: PostgresRepository,
    datasource: DataSource,
    validator: OwnershipValidator,
    signatureRecover: SignatureRecover

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address, Contenthash],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
    signatureRecover = new SignatureRecover()
    const chainId = 1
    validator = new OwnershipValidator(chainId, signatureRecover, [repo])
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
        const name = 'blockful.eth'
        const node = namehash(name)
        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo))
        await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [
            {
              name: toHex(packetToBytes(name)),
              owner,
              duration: 300n,
              secret: zeroHash,
              resolver: TEST_ADDRESS,
              data: [],
              reverseRecord: false,
              fuses: 0,
              extraData: zeroHash,
            },
          ],
        })

        const d = await datasource.getRepository(Domain).findOneBy({
          node,
          owner,
        })
        assert(d !== null)
        expect(d.name).toEqual(name)
        expect(d.parent).toEqual(namehash('eth'))
        expect(d.ttl).toEqual(300)
      })

      // Register a domain 'public.eth' with a given TTL, then attempt to register the same domain with a different TTL
      it('should block duplicated domains', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const domain = new Domain()
        domain.name = 'public.eth'
        domain.node = namehash('public.eth')
        domain.ttl = '300'
        domain.owner = owner
        domain.parent = namehash('eth')
        domain.resolver = TEST_ADDRESS
        domain.resolverVersion = '1'
        await datasource.manager.save(domain)

        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [
            {
              name: toHex(packetToBytes(domain.name)),
              owner,
              duration: 300n,
              secret: zeroHash,
              resolver: TEST_ADDRESS,
              data: [],
              reverseRecord: false,
              fuses: 0,
              extraData: zeroHash,
            },
          ],
        })

        expect(result.data.length).toEqual(0)
        expect(result.error).toEqual('Domain already exists')

        const d = await datasource.getRepository(Domain).countBy({
          node: domain.node,
          owner,
        })
        expect(d).toEqual(1)
      })

      it('should create new domain with records', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const name = 'blockful.eth'
        const node = namehash(name)
        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo))
        const calldata = [
          encodeFunctionData({
            abi: parseAbi(abi),
            functionName: 'setText',
            args: [node, 'com.twitter', '@blockful.eth'],
          }),
          encodeFunctionData({
            functionName: 'setAddr',
            abi: parseAbi(abi),
            args: [node, '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a0'],
          }),
          encodeFunctionData({
            functionName: 'setAddr',
            abi: parseAbi(abi),
            args: [node, 1n, '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a2'],
          }),
        ]
        await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [
            {
              name: toHex(packetToBytes(name)),
              owner,
              duration: 300n,
              secret: zeroHash,
              resolver: TEST_ADDRESS,
              data: calldata,
              reverseRecord: false,
              fuses: 0,
              extraData: zeroHash,
            },
          ],
        })

        const actual = await datasource.getRepository(Domain).findOneBy({
          node,
          owner,
        })
        assert(actual !== null)
        expect(actual.name).toEqual(name)
        expect(actual.parent).toEqual(namehash('eth'))
        expect(actual.ttl).toEqual(300)

        const actualText = await datasource.getRepository(Text).existsBy({
          domain: node,
          key: 'com.twitter',
        })
        expect(actualText).toBe(true)
        const actualAddress = await datasource.getRepository(Address).existsBy({
          domain: node,
          address: '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a0',
          coin: '60',
        })
        expect(actualAddress).toBe(true)
        const actualAddressWithCoin = await datasource
          .getRepository(Address)
          .existsBy({
            domain: node,
            address: '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a2',
            coin: '1',
          })
        expect(actualAddressWithCoin).toBe(true)
      })

      it('should block registering a domain with records from another domain', async () => {
        const pvtKey = generatePrivateKey()
        const owner = privateKeyToAddress(pvtKey)
        const name = 'blockful.eth'
        const server = new ccip.Server()
        server.add(abi, withRegisterDomain(repo))

        const anotherNode = namehash('another.eth')

        const calldata = [
          encodeFunctionData({
            abi: parseAbi(abi),
            functionName: 'setText',
            args: [anotherNode, 'com.twitter', '@blockful.eth'],
          }),
          encodeFunctionData({
            functionName: 'setAddr',
            abi: parseAbi(abi),
            args: [anotherNode, '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a0'],
          }),
          encodeFunctionData({
            functionName: 'setAddr',
            abi: parseAbi(abi),
            args: [
              anotherNode,
              1n,
              '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a2',
            ],
          }),
        ]
        await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'register',
          pvtKey,
          args: [
            {
              name: toHex(packetToBytes(name)),
              owner,
              duration: 300n,
              secret: zeroHash,
              resolver: TEST_ADDRESS,
              data: calldata,
              reverseRecord: false,
              fuses: 0,
              extraData: zeroHash,
            },
          ],
        })

        const actual = await datasource.getRepository(Domain).existsBy({
          node: namehash(name),
          owner,
        })
        expect(actual).toBe(false)
      })
    })

    describe('Transfer Domain', () => {
      it('should transfer existing domain', async () => {
        const pvtKey = generatePrivateKey()
        const node = namehash('blockful.eth')
        const domain = new Domain()
        domain.node = node
        domain.name = 'blockful.eth'
        domain.parent = namehash('eth')
        domain.resolver = TEST_ADDRESS
        domain.resolverVersion = '1'
        domain.ttl = '300'
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
        const node = namehash('blockful.eth') as `0x${string}`

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
        domain.name = 'public.eth'
        domain.node = namehash('public.eth')
        domain.parent = namehash('eth')
        domain.resolver = TEST_ADDRESS
        domain.resolverVersion = '1'
        domain.ttl = '300'
        domain.owner = privateKeyToAddress(pvtKey)
        await datasource.manager.save(domain)

        const contenthash =
          'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450'

        const server = new ccip.Server()
        server.add(abi, withSetContentHash(repo, validator))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'setContenthash',
          pvtKey,
          args: [domain.node, stringToHex(contenthash)],
        })

        expect(result.data.length).toEqual(0)

        const d = await datasource.getRepository(Contenthash).findOneBy({
          domain: domain.node,
        })
        assert(d !== null)
        expect(d.contenthash).toEqual(contenthash)
      })

      // Register a domain 'public.eth' with a content hash, then query for it
      it('should query contenthash', async () => {
        const domain = new Domain()
        domain.name = 'public.eth'
        domain.node = namehash('public.eth')
        domain.parent = namehash('eth')
        domain.resolver = TEST_ADDRESS
        domain.resolverVersion = '1'
        domain.ttl = '300'
        domain.owner = privateKeyToAddress(generatePrivateKey())
        await datasource.manager.save(domain)

        const content = new Contenthash()
        const expected =
          '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909'
        content.contenthash = expected
        content.domain = domain.node
        await datasource.manager.save(content)

        const server = new ccip.Server()
        server.add(abi, withGetContentHash(repo))
        const result = await doCall({
          server,
          abi,
          sender: TEST_ADDRESS,
          method: 'contenthash',
          args: [content.domain],
        })

        expect(result.data.length).toEqual(1)
        const [value] = result.data
        expect(value).toEqual(toHex(expected))
        expect(parseInt(result.ttl!)).toBeCloseTo(
          parseInt(formatTTL(parseInt(domain.ttl))),
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
      domain.name = 'public.eth'
      domain.node = namehash(domain.name)
      domain.ttl = '300'
      domain.parent = namehash('eth')
      domain.resolver = TEST_ADDRESS
      domain.resolverVersion = '1'
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
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
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
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
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
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
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
        parseInt(formatTTL(parseInt(domain.ttl))),
        2,
      )
    })

    it('should deny setting ABI key', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey,
        args: [domain.node, 'ABI', 'ABI'],
      })

      expect(result.data.length).toEqual(0)
      expect(result.error).toEqual('Reserved key')

      const exists = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'ABI' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getExists()
      expect(exists).toBe(false)
    })

    it('should deny setting ABI key', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetText(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setText',
        pvtKey,
        args: [domain.node, 'pubkey', 'pubkey'],
      })

      expect(result.data.length).toEqual(0)
      expect(result.error).toEqual('Reserved key')

      const exists = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'pubkey' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getExists()
      expect(exists).toBe(false)
    })
  })

  describe('Address', () => {
    let domain: Domain, pvtKey: `0x${string}`

    beforeEach(async () => {
      domain = new Domain()
      domain.name = 'public.eth'
      domain.node = namehash(domain.name)
      domain.parent = namehash('eth')
      domain.resolver = TEST_ADDRESS
      domain.resolverVersion = '1'
      domain.ttl = '300'
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
      addr.domain = domain.node
      addr.resolver = TEST_ADDRESS
      addr.resolverVersion = '1'
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
      addr.domain = domain.node
      addr.resolver = TEST_ADDRESS
      addr.resolverVersion = '1'
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
      expect(parseInt(result.ttl!)).toBeCloseTo(
        parseInt(formatTTL(parseInt(domain.ttl))),
      )
    })
  })

  describe('ABI', () => {
    let domain: Domain, pvtKey: `0x${string}`, expectedAbi: string

    beforeEach(async () => {
      domain = new Domain()
      domain.name = 'public.eth'
      domain.node = namehash(domain.name)
      domain.parent = namehash('eth')
      domain.resolver = TEST_ADDRESS
      domain.resolverVersion = '1'
      domain.ttl = '300'
      pvtKey = generatePrivateKey()
      domain.owner = privateKeyToAddress(pvtKey)
      domain = await datasource.manager.save(domain)

      expectedAbi = toHex(
        JSON.stringify([
          {
            type: 'function',
            name: 'hello',
            inputs: [],
            outputs: [
              {
                name: 'hello',
                type: 'string',
                internalType: 'string',
              },
            ],
          },
        ]),
      )
    })

    it('should set new abi', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetAbi(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setABI',
        pvtKey,
        args: [domain.node, 0, expectedAbi],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'ABI' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.key).toEqual('ABI')
      expect(actual[0]?.value).toEqual(expectedAbi)
    })

    it('should read abi', async () => {
      const server = new ccip.Server()
      server.add(abi, withGetAbi(repo))
      const text = new Text()
      text.key = 'ABI'
      text.value = expectedAbi
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'ABI',
        pvtKey,
        args: [domain.node, 0],
      })

      const response = result.data[0]! as unknown[]
      expect(response.length).toEqual(2)
      const [contentType, actual] = response
      expect(contentType).toEqual(0n)
      expect(actual).toEqual(expectedAbi)
    })

    it('should update abi', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetAbi(repo, validator))
      const text = new Text()
      text.key = 'ABI'
      text.value = toHex('[{}]')
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setABI',
        pvtKey,
        args: [domain.node, 0, expectedAbi],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'ABI' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.key).toEqual('ABI')
      expect(actual[0]?.value).toEqual(expectedAbi)
    })
  })

  describe('pubkey', () => {
    let domain: Domain,
      pvtKey: `0x${string}`,
      expectedDb: string,
      expectedX: Hex,
      expectedY: Hex

    beforeEach(async () => {
      domain = new Domain()
      domain.node = namehash('public.eth') as `0x${string}`
      domain.ttl = '300'
      domain.name = 'public.eth'
      domain.parent = namehash('eth')
      domain.resolver = TEST_ADDRESS
      domain.resolverVersion = '1'
      pvtKey = generatePrivateKey()
      domain.owner = privateKeyToAddress(pvtKey)
      domain = await datasource.manager.save(domain)
      expectedX = pad(toHex('10'), { dir: 'right' })
      expectedY = pad(toHex('20'), { dir: 'right' })
      expectedDb = `(${expectedX},${expectedY})`
    })

    it('should set new pubkey', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetPubkey(repo, validator))
      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setPubkey',
        pvtKey,
        args: [domain.node, expectedX, expectedY],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'pubkey' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).toBe(1)
      expect(actual[0]?.key).toEqual('pubkey')
      expect(actual[0]?.value).toEqual(expectedDb)
    })

    it('should read abi', async () => {
      const server = new ccip.Server()
      server.add(abi, withGetPubkey(repo))
      const text = new Text()
      text.key = 'pubkey'
      text.value = expectedDb
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'pubkey',
        pvtKey,
        args: [domain.node],
      })

      const response = result.data[0]! as unknown[]
      expect(response.length).toEqual(2)
      const [actualX, actualY] = response
      expect(actualX).toEqual(expectedX)
      expect(actualY).toEqual(expectedY)
    })

    it('should update abi', async () => {
      const server = new ccip.Server()
      server.add(abi, withSetPubkey(repo, validator))
      const text = new Text()
      text.key = 'pubkey'
      text.value = '(0x123,0x456)'
      text.domain = domain.node
      text.resolver = TEST_ADDRESS
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const result = await doCall({
        server,
        abi,
        sender: TEST_ADDRESS,
        method: 'setPubkey',
        pvtKey,
        args: [domain.node, expectedX, expectedY],
      })

      expect(result.data.length).toEqual(0)

      const [actual, count] = await datasource
        .getRepository(Text)
        .createQueryBuilder()
        .where('key = :key', { key: 'pubkey' })
        .andWhere('domain = :domain', { domain: domain.node })
        .getManyAndCount()
      expect(count).eq(1)
      expect(actual[0]?.key).toEqual('pubkey')
      expect(actual[0]?.value).toEqual(expectedDb)
    })
  })
})
