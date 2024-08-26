/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest'
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
  toHex,
  Address,
  stringToHex,
} from 'viem'
import { namehash } from 'viem/ens'
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'
import request from 'supertest'

import * as ccip from '@blockful/ccip-server'

import { abi as serverAbi } from '../src/abi'
import { serializeTypedSignature, signData } from './helper'
import {
  withGetAddr,
  withGetAddrByCoin,
  withGetContentHash,
  withGetText,
  withRegisterDomain,
  withSetAddr,
  withSetAddrByCoin,
  withSetContentHash,
  withSetText,
  withTransferDomain,
} from '../src/handlers'
import { InMemoryRepository } from '../src/repositories'
import { withSigner, makeMessageHash } from '../src/middlewares'
import { Domain } from '../src/entities'
import {
  OwnershipValidator,
  SignatureRecover,
  formatTTL,
} from '../src/services'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'
const abi = parseAbi(serverAbi)

describe('Gateway API', () => {
  let repo: InMemoryRepository,
    domain: Domain,
    pvtKey: Hex,
    owner: Address,
    validator: OwnershipValidator,
    signatureRecover: SignatureRecover

  beforeAll(async () => {
    repo = new InMemoryRepository()
    pvtKey = generatePrivateKey()
    signatureRecover = new SignatureRecover()
  })

  beforeEach(async () => {
    owner = privateKeyToAddress(pvtKey)
    domain = {
      name: 'public.eth',
      node: namehash('public.eth'),
      parent: namehash('eth'),
      owner,
      ttl: 300,
      contenthash:
        '0x4d1ae8fa44de34a527a9c6973d37dfda8befc18ca6ec73fd97535b4cf02189c6', // public goods
      addresses: [],
      texts: [],
      resolver: TEST_ADDRESS,
      resolverVersion: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const domains = new Map()
    domains.set(domain.node, domain)
    repo.setDomains(domains)
    const chainId = 1
    validator = new OwnershipValidator(chainId, signatureRecover, [repo])
  })

  afterEach(async () => {
    await repo.clear()
  })

  describe('API Domain', () => {
    describe('Register domain', () => {
      it('should register new domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withRegisterDomain(repo))
        const app = server.makeApp('/')

        const domain: Omit<Domain, 'createdAt' | 'updatedAt'> = {
          name: 'newdomain.eth',
          node: namehash('newdomain.eth'),
          parent: namehash('eth'),
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          owner,
          ttl: 300,
          addresses: [],
          texts: [],
        }

        const args = [toHex(domain.name), domain.ttl, owner]
        const data = encodeFunctionData({
          abi,
          functionName: 'register',
          args,
        })

        const signature = await signData({
          pvtKey,
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
          node: domain.node,
        })
        expect(response).toMatchObject(domain)
      })

      it('should block registering existing domain', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withRegisterDomain(repo))
        const app = server.makeApp('/')

        const args = [toHex(domain.name), domain.ttl, owner]
        const data = encodeFunctionData({
          abi,
          functionName: 'register',
          args,
        })

        const signature = await signData({
          pvtKey,
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
        })
        expect(response).toEqual(domain)
      })

      it('should allow registering a domain with a different owner', async () => {
        const server = new ccip.Server()
        server.add(serverAbi, withRegisterDomain(repo))
        const app = server.makeApp('/')

        const newOwner = privateKeyToAddress(generatePrivateKey())
        const domain: Omit<Domain, 'createdAt' | 'updatedAt'> = {
          name: 'newdomain.eth',
          node: namehash('newdomain.eth'),
          parent: namehash('eth'),
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          owner: newOwner,
          ttl: 300,
          addresses: [],
          texts: [],
        }

        const args = [toHex(domain.name), domain.ttl, newOwner]
        const data = encodeFunctionData({
          abi,
          functionName: 'register',
          args,
        })

        const signature = await signData({
          pvtKey, // different signer
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

        expect(r.status).toEqual(200)

        const actual = await repo.getDomain({
          node: domain.node,
        })
        expect(actual).toMatchObject(domain)
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
          pvtKey,
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
          pvtKey,
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
          pvtKey,
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
        server.app.use(withSigner(pvtKey))
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
            address: privateKeyToAddress(pvtKey),
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
        pvtKey,
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
          domain: domain.node,
          key,
          value: 'blockful',
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
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
        pvtKey,
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
          domain: domain.node,
          key,
          value,
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const server = new ccip.Server()
      server.app.use(withSigner(pvtKey))
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
          address: privateKeyToAddress(pvtKey),
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
      server.app.use(withSigner(pvtKey))
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
    it('should set ethereum address', async () => {
      const address = privateKeyToAddress(pvtKey)
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
        pvtKey,
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

    it('should update ethereum address', async () => {
      repo.setAddresses([
        {
          domain: domain.node,
          coin: '60',
          address: TEST_ADDRESS,
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const address = privateKeyToAddress(pvtKey)
      const server = new ccip.Server()
      server.app.use(withSigner(pvtKey))
      server.add(serverAbi, withSetAddr(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, address]
      const data = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args,
      })

      const signature = await signData({
        pvtKey,
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

    it('should set bitcoin address', async () => {
      const server = new ccip.Server()
      server.add(serverAbi, withSetAddrByCoin(repo, validator))
      const app = server.makeApp('/')

      const expected = stringToHex('1FWQiwK27EnGXb6BiBMRLJvunJQZZPMcGd')

      const args = [domain.node, 0, expected]
      const data = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args,
      })

      const signature = await signData({
        pvtKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setAddr',
          args,
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
        node: domain.node,
        coin: '0',
      })
      expect(response?.value).toEqual(expected)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should update BTC address', async () => {
      const expected = stringToHex('1FWQiwK27EnGXb6BiBMRLJvunJQZZPMcGd')

      repo.setAddresses([
        {
          domain: domain.node,
          coin: '0',
          address: expected,
          resolver: expected,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const server = new ccip.Server()
      server.app.use(withSigner(pvtKey))
      server.add(serverAbi, withSetAddrByCoin(repo, validator))
      const app = server.makeApp('/')

      const args = [domain.node, 0, expected]
      const data = encodeFunctionData({
        abi,
        functionName: 'setAddr',
        args,
      })

      const signature = await signData({
        pvtKey,
        args,
        sender: TEST_ADDRESS,
        func: getAbiItem({
          abi,
          name: 'setAddr',
          args,
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
        node: domain.node,
        coin: '0',
      })
      expect(response?.value).toEqual(expected)
      expect(response?.ttl).toEqual(domain.ttl)
    })

    it('should handle GET request for BTC addr', async () => {
      const expected = stringToHex('1FWQiwK27EnGXb6BiBMRLJvunJQZZPMcGd')

      repo.setAddresses([
        {
          domain: domain.node,
          coin: '0',
          address: expected,
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const server = new ccip.Server()
      server.app.use(withSigner(pvtKey))
      server.add(serverAbi, withGetAddrByCoin(repo))
      const app = server.makeApp('/')

      const args = [domain.node, 0]
      const calldata = encodeFunctionData({
        abi,
        functionName: 'addr',
        args,
      })

      const response = await request(app).get(
        `/${TEST_ADDRESS}/${calldata}.json`,
      )

      expect(response.text).not.toBeNull()

      const [data, ttl, sig] = decodeAbiParameters(
        parseAbiParameters('bytes,uint64,bytes'),
        response.text as Hex,
      )

      const msgHash = makeMessageHash(TEST_ADDRESS, ttl, calldata, data)
      expect(
        await verifyMessage({
          address: privateKeyToAddress(pvtKey),
          message: { raw: msgHash },
          signature: sig,
        }),
      ).toBeTruthy()

      expect(
        decodeFunctionResult({
          abi,
          functionName: 'addr',
          data,
          args,
        }),
      ).toEqual(expected)
    })

    it('should handle GET request for addr on ethereum', async () => {
      const address = privateKeyToAddress(pvtKey)
      repo.setAddresses([
        {
          domain: domain.node,
          coin: '60',
          address,
          resolver: TEST_ADDRESS,
          resolverVersion: '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const server = new ccip.Server()
      server.app.use(withSigner(pvtKey))
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
          address: privateKeyToAddress(pvtKey),
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
      server.app.use(withSigner(pvtKey))
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
