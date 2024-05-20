/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
import { hash as namehash } from 'eth-ens-namehash'
import {
  Hex,
  encodeFunctionData,
  decodeFunctionResult,
  parseAbi,
  decodeAbiParameters,
  parseAbiParameters,
  verifyMessage,
} from 'viem'
import {
  generatePrivateKey,
  privateKeyToAccount,
  privateKeyToAddress,
} from 'viem/accounts'
import request from 'supertest'

import { NewServer, abi as serverAbi } from '../src/server'
import {
  withGetAddr,
  withGetContentHash,
  withGetText,
  withSetAddr,
  withSetContentHash,
  withSetText,
} from '../src/handlers'
import { InMemoryRepository } from '../src/repositories'
import { withSigner, makeMessageHash } from '../src/middlewares'
import { Domain } from '../src/entities'
import { OwnershipValidator } from '../src/services'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'
const abi = parseAbi(serverAbi)

describe('Gateway API', () => {
  let repo: InMemoryRepository,
    domain: Domain,
    privateKey: Hex,
    validator: OwnershipValidator

  beforeAll(async () => {
    repo = new InMemoryRepository()
    privateKey = generatePrivateKey()
  })

  beforeEach(async () => {
    const node = namehash('public.eth') as Hex
    domain = {
      node,
      owner: privateKeyToAddress(privateKey),
      ttl: 2000,
      contenthash:
        '0x4d1ae8fa44de34a527a9c6973d37dfda8befc18ca6ec73fd97535b4cf02189c6', // public goods
      addresses: [],
      texts: [],
    }
    const domains = new Map()
    domains.set(node, domain)
    repo.setDomains(domains)
    validator = new OwnershipValidator(repo)
  })

  afterEach(async () => await repo.clear())

  describe('API Domain', () => {
    it('should handle set contenthash', async () => {
      const contenthash =
        '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful

      const app = NewServer(withSetContentHash(repo, validator)).makeApp('/')

      const data = encodeFunctionData({
        abi,
        functionName: 'setContenthash',
        args: [domain.node, contenthash],
      })
      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: data } })
      await request(app)
        .post('/')
        .send({ data, signature, sender: TEST_ADDRESS })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')

      const response = await repo.getContentHash({
        node: domain.node as `0x${string}`,
      })
      expect(response?.value).toEqual(contenthash)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle GET contenthash', async () => {
      const app = NewServer(withGetContentHash(repo)).makeApp(
        '/',
        withSigner(privateKey, ['function contenthash(bytes32 node)']),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'contenthash',
        args: [domain.node],
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.text).not.toBeNull()

      const [data, ttl, sig] = decodeAbiParameters(
        parseAbiParameters('bytes,uint64,bytes'),
        response.text as Hex,
      )

      const mshHash = makeMessageHash(TEST_ADDRESS, ttl, calldata, data)
      expect(
        await verifyMessage({
          address: privateKeyToAddress(privateKey),
          message: { raw: mshHash },
          signature: sig,
        }),
      ).toBeTruthy()

      expect(
        decodeFunctionResult({
          abi,
          functionName: 'contenthash',
          data,
        }),
      ).toEqual(domain.contenthash)
      expect(ttl).toEqual(BigInt(domain.ttl))
    })
  })

  describe('API Text', () => {
    it('should handle request for set new text', async () => {
      const key = 'company'
      const value = 'blockful'
      const app = NewServer(withSetText(repo, validator)).makeApp('/')

      const calldata = encodeFunctionData({
        abi,
        functionName: 'setText',
        args: [domain.node, key, value],
      })

      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: calldata } })
      await request(app)
        .post('/')
        .send({ data: calldata, signature, sender: TEST_ADDRESS })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')

      const response = await repo.getText({
        node: domain.node as `0x${string}`,
        key,
      })
      expect(response?.value).toEqual(value)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle request for update text', async () => {
      const key = 'company'
      const value = 'blockful-io'

      repo.setTexts([
        {
          domain,
          key,
          value: 'blockful',
        },
      ])
      const app = NewServer(withSetText(repo, validator)).makeApp('/')

      const calldata = encodeFunctionData({
        abi,
        functionName: 'setText',
        args: [domain.node, key, value],
      })

      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: calldata } })
      await request(app)
        .post('/')
        .send({ data: calldata, signature, sender: TEST_ADDRESS })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')

      const response = await repo.getText({
        node: domain.node as `0x${string}`,
        key,
      })
      expect(response?.value).toEqual(value)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle GET request for text', async () => {
      const key = 'company'
      const value = 'blockful'
      repo.setTexts([
        {
          domain,
          key,
          value,
        },
      ])
      const app = NewServer(withGetText(repo)).makeApp(
        '/',
        withSigner(privateKey, ['function text(bytes32 node, string key)']),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'text',
        args: [domain.node, key],
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.text).not.toBeNull()

      const [data, ttl, sig] = decodeAbiParameters(
        parseAbiParameters('bytes,uint64,bytes'),
        response.text as Hex,
      )

      const mshHash = makeMessageHash(TEST_ADDRESS, ttl, calldata, data)
      expect(
        await verifyMessage({
          address: privateKeyToAddress(privateKey),
          message: { raw: mshHash },
          signature: sig,
        }),
      ).toBeTruthy()

      expect(
        decodeFunctionResult({
          abi,
          functionName: 'text',
          data,
        }),
      ).toEqual(value)
    })

    it('should handle GET request for not existing text', async () => {
      const app = NewServer(withGetText(repo)).makeApp(
        '/',
        withSigner(privateKey, ['function text(bytes32 node, string key)']),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'text',
        args: [domain.node, 'Bahia'],
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.body).not.toBeNull()
      expect(response.body?.data).toEqual('0x')
    })
  })

  describe('API Address', () => {
    // TODO: test multicoin read/write when issue is solved: https://github.com/smartcontractkit/ccip-read/issues/32

    it('should handle set request for setAddr on ethereum', async () => {
      const address = privateKeyToAddress(privateKey)
      const app = NewServer(withSetAddr(repo, validator)).makeApp('/')

      const calldata = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args: [domain.node, address],
      })

      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: calldata } })
      await request(app)
        .post('/')
        .send({ data: calldata, signature, sender: TEST_ADDRESS })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')

      const response = await repo.getAddr({
        node: domain.node as `0x${string}`,
      })
      expect(response?.value).toEqual(address)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle request for update address', async () => {
      repo.setAddresses([
        {
          domain,
          coin: 60,
          address: '0x',
        },
      ])
      const address = privateKeyToAddress(privateKey)
      const app = NewServer(withSetAddr(repo, validator)).makeApp(
        '/',
        withSigner(privateKey, []),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args: [domain.node, address],
      })

      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: calldata } })
      await request(app)
        .post('/')
        .send({ data: calldata, signature, sender: TEST_ADDRESS })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')

      const response = await repo.getAddr({
        node: domain.node as `0x${string}`,
      })
      expect(response?.value).toEqual(address)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle GET request for addr on ethereum', async () => {
      const address = privateKeyToAddress(privateKey)
      repo.setAddresses([
        {
          domain,
          coin: 60,
          address,
        },
      ])
      const app = NewServer(withGetAddr(repo)).makeApp(
        '/',
        withSigner(privateKey, ['function addr(bytes32 node)']),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'addr',
        args: [domain.node],
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.text).not.toBeNull()

      const [data, ttl, sig] = decodeAbiParameters(
        parseAbiParameters('bytes,uint64,bytes'),
        response.text as Hex,
      )

      const mshHash = makeMessageHash(TEST_ADDRESS, ttl, calldata, data)
      expect(
        await verifyMessage({
          address: privateKeyToAddress(privateKey),
          message: { raw: mshHash },
          signature: sig,
        }),
      ).toBeTruthy()

      expect(
        decodeFunctionResult({
          abi,
          functionName: 'addr',
          data,
        }),
      ).toEqual(address)
    })

    it('should handle GET request for invalid address ', async () => {
      const app = NewServer(withGetAddr(repo)).makeApp(
        '/',
        withSigner(privateKey, ['function addr(bytes32 node)']),
      )

      const calldata = encodeFunctionData({
        abi,
        functionName: 'addr',
        args: [domain.node],
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.body).not.toBeNull()
      expect(response.body?.data).toEqual('0x')
    })
  })
})
