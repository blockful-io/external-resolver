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
  getAbiItem,
  AbiFunction,
} from 'viem'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'
import request from 'supertest'
import * as ccip from '@blockful/ccip-server'

import { abi as serverAbi } from '../src/abi'
import { serializeTypedSignature, signData } from './helper'
import {
  withGetAddr,
  withGetContentHash,
  withGetText,
  withRegisterDomain,
  withSetAddr,
  withSetContentHash,
  withSetText,
  withTransferDomain,
} from '../src/handlers'
import { InMemoryRepository } from '../src/repositories'
import { withSigner, makeMessageHash, withLogger } from '../src/middlewares'
import { Domain } from '../src/entities'
import { OwnershipValidator, formatTTL } from '../src/services'

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
      ttl: 300,
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
    describe('Register domain', () => {
      it('should register new domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withRegisterDomain(repo, validator))
        const app = server.makeApp('/')

        const domain: Domain = {
          node: namehash('newdomain.eth'),
          owner: privateKeyToAddress(privateKey),
          ttl: 300,
          addresses: [],
          texts: [],
        }

        const args = [domain.node, domain.ttl]
        const data = encodeFunctionData({
          abi,
          functionName: 'register',
          args,
        })

        const signature = await signData({
          pvtKey: privateKey,
          args,
          sender: TEST_ADDRESS,
          func: getAbiItem({
            abi,
            name: 'register',
          }) as AbiFunction,
        })
        await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            data,
            signature: serializeTypedSignature(signature),
            sender: TEST_ADDRESS,
          })

        const response = await repo.getDomain({
          node: domain.node as `0x${string}`,
          coin: '60',
        })
        expect(response).toEqual(domain)
      })

      it('should handle registering existing domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withRegisterDomain(repo, validator))
        const app = server.makeApp('/')

        const args = [domain.node, domain.ttl]
        const data = encodeFunctionData({
          abi,
          functionName: 'register',
          args,
        })

        const signature = await signData({
          pvtKey: privateKey,
          args,
          sender: TEST_ADDRESS,
          func: getAbiItem({
            abi,
            name: 'register',
          }) as AbiFunction,
        })
        const r = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            data,
            signature: serializeTypedSignature(signature),
            sender: TEST_ADDRESS,
          })

        expect(r.body.error).toEqual('Domain already exists')
        expect(r.status).toEqual(400)

        const response = await repo.getDomain({
          node: domain.node as `0x${string}`,
          coin: '60',
        })
        expect(response).toEqual(domain)
      })
    })

    describe('Transfer domain', () => {
      it('should transfer existing domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withTransferDomain(repo, validator))
        const app = server.makeApp('/')

        const expectedOwner = privateKeyToAddress(generatePrivateKey())
        const args = [domain.node, expectedOwner]
        const data = encodeFunctionData({
          abi,
          functionName: 'transfer',
          args,
        })

        const signature = await signData({
          pvtKey: privateKey,
          args,
          sender: TEST_ADDRESS,
          func: getAbiItem({
            abi,
            name: 'transfer',
          }) as AbiFunction,
        })
        await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            data,
            signature: serializeTypedSignature(signature),
            sender: TEST_ADDRESS,
          })

        const response = await repo.getDomain({
          node: domain.node as `0x${string}`,
          coin: '60',
        })
        expect(response).toEqual({ ...domain, owner: expectedOwner })
      })

      it('should handle transfer non existing domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withTransferDomain(repo, validator))
        const app = server.makeApp('/')

        const node = namehash('notfound.eth') as `0x${string}`
        const args = [node, privateKeyToAddress(generatePrivateKey())]
        const data = encodeFunctionData({
          abi,
          functionName: 'transfer',
          args,
        })

        const signature = await signData({
          pvtKey: privateKey,
          args,
          sender: TEST_ADDRESS,
          func: getAbiItem({
            abi,
            name: 'transfer',
          }) as AbiFunction,
        })
        const r = await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            data,
            signature: serializeTypedSignature(signature),
            sender: TEST_ADDRESS,
          })

        expect(r.body.error).toEqual('Unauthorized')
        expect(r.status).toEqual(401)

        const response = await repo.getDomain({
          node,
          coin: '60',
        })
        expect(response).toBeNull()
      })
    })

    describe('Contenthash', () => {
      it('should handle set contenthash', async () => {
        const contenthash =
          '0x1e583a944ea6750b0904b8f95a72f593f070ecac52e8d5bc959fa38d745a3909' // blockful

        const server = new ccip.Server()
        server.add(serverAbi, withSetContentHash(repo, validator))
        const app = server.makeApp('/')

        const args = [domain.node, contenthash]
        const data = encodeFunctionData({
          abi,
          functionName: 'setContenthash',
          args,
        })

        const signature = await signData({
          pvtKey: privateKey,
          args,
          sender: TEST_ADDRESS,
          func: getAbiItem({
            abi,
            name: 'setContenthash',
          }) as AbiFunction,
        })
        await request(app)
          .post('/')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .send({
            data,
            signature: serializeTypedSignature(signature),
            sender: TEST_ADDRESS,
          })

        const response = await repo.getContentHash({
          node: domain.node as `0x${string}`,
          coin: '60',
        })
        expect(response?.value).toEqual(contenthash)
        expect(response?.ttl).toEqual(domain.ttl)
      })

      it('should handle GET contenthash', async () => {
        const server = new ccip.Server()
        server.app.use(withSigner(privateKey))
        server.add(serverAbi, withGetContentHash(repo))
        const app = server.makeApp('/')

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
        expect(parseInt(ttl.toString())).toBeCloseTo(
          parseInt(formatTTL(domain.ttl)),
        )
      })
    })
  })

  describe('API Text', () => {
    it('should handle request for set new text', async () => {
      const key = 'company'
      const value = 'blockful'
      const server = new ccip.Server()
      server.add(serverAbi, withSetText(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, key, value]
      const data = encodeFunctionData({
        abi,
        functionName: 'setText',
        args,
      })

      const signature = await signData({
        pvtKey: privateKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setText',
        }) as AbiFunction,
      })
      await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          data,
          signature: serializeTypedSignature(signature),
          sender: TEST_ADDRESS,
        })

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
      const server = new ccip.Server()
      server.add(serverAbi, withSetText(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, key, value]
      const data = encodeFunctionData({
        abi,
        functionName: 'setText',
        args,
      })

      const signature = await signData({
        pvtKey: privateKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setText',
        }) as AbiFunction,
      })
      await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          data,
          signature: serializeTypedSignature(signature),
          sender: TEST_ADDRESS,
        })

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
      const server = new ccip.Server()
      server.app.use(withSigner(privateKey))
      server.add(serverAbi, withGetText(repo))
      const app = server.makeApp('/')

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
      const server = new ccip.Server()
      server.app.use(withSigner(privateKey))
      server.app.use(withLogger({ abi: serverAbi }))
      server.add(serverAbi, withGetText(repo))
      const app = server.makeApp('/')

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
      const server = new ccip.Server()
      server.add(serverAbi, withSetAddr(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, address]
      const data = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args,
      })

      const signature = await signData({
        pvtKey: privateKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setAddr',
        }) as AbiFunction,
      })
      await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          data,
          signature: serializeTypedSignature(signature),
          sender: TEST_ADDRESS,
        })

      const response = await repo.getAddr({
        node: domain.node as `0x${string}`,
        coin: '60',
      })
      expect(response?.value).toEqual(address)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle request for update address', async () => {
      repo.setAddresses([
        {
          domain,
          coin: '60',
          address: '0x',
        },
      ])
      const address = privateKeyToAddress(privateKey)
      const server = new ccip.Server()
      server.app.use(withSigner(privateKey))
      server.add(serverAbi, withSetAddr(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, address]
      const data = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args,
      })

      const signature = await signData({
        pvtKey: privateKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setAddr',
        }) as AbiFunction,
      })
      await request(app)
        .post('/')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          data,
          signature: serializeTypedSignature(signature),
          sender: TEST_ADDRESS,
        })

      const response = await repo.getAddr({
        node: domain.node as `0x${string}`,
        coin: '60',
      })
      expect(response?.value).toEqual(address)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle GET request for addr on ethereum', async () => {
      const address = privateKeyToAddress(privateKey)
      repo.setAddresses([
        {
          domain,
          coin: '60',
          address,
        },
      ])
      const server = new ccip.Server()
      server.app.use(withSigner(privateKey))
      server.add(serverAbi, withGetAddr(repo))
      const app = server.makeApp('/')

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
      const server = new ccip.Server()
      server.app.use(withSigner(privateKey))
      server.add(serverAbi, withGetAddr(repo))
      const app = server.makeApp('/')

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
