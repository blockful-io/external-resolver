/*
  This test script (e2e.spec.ts) aims to perform integrated testing of the project. It executes a series of actions,
  including deploying the contracts (registry, offchain resolver, and universal resolver), creating the Client using Viem, 
  and initializing the gateway locally. After deploying and configuring the contracts, the Client can access
  off-chain information during the tests. It's important to note that this initial test script only sets up the
  environment and stops at the gateway call. It still requires implementing the connection between the gateway and 
  layer two, or the gateway and the database.
*/
import 'reflect-metadata'

// Importing abi and bytecode from contracts folder
import { abi as abiDBResolver } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as abiOffchainRegister } from '@blockful/contracts/out/WildcardWriting.sol/OffchainRegister.json'

import { abi as abiUniversalResolver } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

import { DataSource } from 'typeorm'
import { ChildProcess, spawn } from 'child_process'
import { normalize, namehash, packetToBytes } from 'viem/ens'
import { anvil, sepolia } from 'viem/chains'
import {
  createTestClient,
  http,
  publicActions,
  walletActions,
  zeroHash,
  encodeFunctionData,
  Hex,
  PrivateKeyAccount,
  toHex,
  stringToHex,
  decodeFunctionResult,
  decodeErrorResult,
} from 'viem'
import { expect } from 'chai'
import {
  generatePrivateKey,
  privateKeyToAccount,
  privateKeyToAddress,
} from 'viem/accounts'

import { DomainData, MessageData } from '@blockful/gateway/src/types'
import { PostgresRepository } from '@blockful/gateway/src/repositories'
import {
  Text,
  Domain,
  Address,
  Contenthash,
} from '@blockful/gateway/src/entities'
import { getRevertErrorData, handleDBStorage } from '../src/client'
import { deployContracts, setupGateway } from './helpers'

const client = createTestClient({
  chain: anvil,
  mode: 'anvil',
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions)

async function offchainWriting({
  encodedName,
  functionName,
  args,
  signer,
  abi,
  universalResolverAddress,
  chainId,
}: {
  encodedName: string
  functionName: string
  signer: PrivateKeyAccount
  abi: unknown[]
  args: unknown[]
  universalResolverAddress: Hex
  chainId?: number
}): Promise<Response | void> {
  const calldata = {
    abi,
    functionName,
    args,
    account: signer,
  }

  try {
    await client.readContract({
      address: universalResolverAddress,
      abi: abiUniversalResolver,
      functionName: 'resolve',
      args: [
        encodedName,
        encodeFunctionData({
          functionName: 'getOperationHandler',
          abi: abiDBResolver,
          args: [encodeFunctionData(calldata)],
        }),
      ],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (!data || !data.args || data.args?.length === 0) return

    const [params] = data.args
    const errorResult = decodeErrorResult({
      abi: abiDBResolver,
      data: params as Hex,
    })
    if (errorResult?.errorName === 'OperationHandledOffchain') {
      const [domain, url, message] = errorResult?.args as [
        DomainData,
        string,
        MessageData,
      ]

      // using for testing the chainId validation
      if (chainId) {
        domain.chainId = chainId
      }
      return await handleDBStorage({ domain, url, message, signer })
    }
  }
}

describe('DatabaseResolver', async () => {
  let repo: PostgresRepository, datasource: DataSource
  const owner = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  )
  let localNode: ChildProcess
  let registryAddr: Hex, universalResolverAddress: Hex, registrarAddr: Hex

  before(async () => {
    localNode = spawn('anvil')

    const {
      registryAddr: _registryAddr,
      universalResolverAddr: _universalResolverAddress,
      registrarAddr: _registrarAddr,
    } = await deployContracts(owner.address)

    registryAddr = _registryAddr
    universalResolverAddress = _universalResolverAddress
    registrarAddr = _registrarAddr

    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address, Contenthash],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
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

  describe('Subdomain created on database', async () => {
    const name = normalize('database.eth')
    const encodedName = toHex(packetToBytes(name))
    const node = namehash(name)
    const resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'

    // used for testing with a domain already in the db
    let domain = new Domain()
    domain.node = node
    domain.name = name
    domain.parent = namehash('eth')
    domain.resolver = resolver
    domain.resolverVersion = '1'
    domain.owner = owner.address
    domain.ttl = '300'

    it('should register new domain', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'register',
        abi: abiOffchainRegister,
        args: [
          {
            name: encodedName,
            owner: owner.address,
            duration: 300n,
            secret: zeroHash,
            resolver,
            extraData: zeroHash,
          },
        ],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const actual = await datasource.getRepository(Domain).findOneBy({
        node,
        owner: owner.address,
      })
      expect(actual?.name).eq(name)
      expect(actual?.owner).eq(owner.address)
      expect(actual?.resolver).eq(resolver)
    })

    it('should block register of duplicated domain with same owner', async () => {
      domain = await datasource.manager.save(domain)

      const response = await offchainWriting({
        encodedName,
        functionName: 'register',
        abi: abiOffchainRegister,
        args: [
          {
            name: encodedName,
            owner: owner.address,
            duration: 300n,
            resolver,
            secret: zeroHash,
            extraData: zeroHash,
          },
        ],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(400)

      const d = await datasource.getRepository(Domain).countBy({
        node,
        owner: owner.address,
      })
      expect(d).eq(1)
    })

    it('should block register of duplicated domain with different owner', async () => {
      domain = await datasource.manager.save(domain)

      const newOwner = privateKeyToAccount(generatePrivateKey())
      const response = await offchainWriting({
        encodedName,
        functionName: 'register',
        abi: abiOffchainRegister,
        args: [
          {
            name: encodedName,
            owner: newOwner.address,
            duration: 300n,
            resolver,
            secret: zeroHash,
            extraData: zeroHash,
          },
        ],
        universalResolverAddress,
        signer: newOwner,
      })

      expect(response?.status).equal(400)

      const d1 = await datasource.getRepository(Domain).existsBy({
        node,
        owner: newOwner.address,
      })
      expect(d1).eq(false)

      const d = await datasource.getRepository(Domain).existsBy({
        node,
        owner: owner.address,
      })
      expect(d).eq(true)

      const count = await datasource.getRepository(Domain).countBy({
        node,
      })
      expect(count).eq(1)
    })

    it('should allow register a domain with different owner', async () => {
      const newOwner = privateKeyToAddress(generatePrivateKey())
      const response = await offchainWriting({
        encodedName,
        functionName: 'register',
        abi: abiOffchainRegister,
        args: [
          {
            name: encodedName,
            owner: newOwner,
            duration: 300n,
            resolver,
            secret: zeroHash,
            extraData: zeroHash,
          },
        ],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const d = await datasource.getRepository(Domain).existsBy({
        node,
        owner: newOwner,
      })
      expect(d).eq(true)
    })

    it('should read and parse the avatar from database', async () => {
      const text = new Text()
      text.domain = node
      text.key = 'avatar'
      text.value = 'ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ'
      text.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const avatar = await client.getEnsAvatar({
        name,
        universalResolverAddress,
      })
      expect(avatar).equal(
        'https://ipfs.io/ipfs/QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ',
      )
    })

    it('should read valid text record from database', async () => {
      const text = new Text()
      text.domain = node
      text.key = 'com.twitter'
      text.value = '@database'
      text.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).equal('@database')
    })

    it('should write valid text record onto the database', async () => {
      domain = await datasource.manager.save(domain)

      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@blockful'],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).equal('@blockful')
    })

    it('should block unauthorized text change', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@unauthorized'],
        universalResolverAddress,
        signer: privateKeyToAccount(generatePrivateKey()),
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).not.eq('@unauthorized')
    })

    it('should block writing text record with different chain ID', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@blockful'],
        universalResolverAddress,
        signer: owner,
        chainId: sepolia.id,
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).eq(null)
    })

    it('should read invalid text record from database', async () => {
      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).to.be.an('null')
    })

    it('should read ETH address from database', async () => {
      const address = new Address()
      address.domain = node
      address.coin = '60'
      address.address = '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'
      address.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      address.resolverVersion = '1'
      await datasource.manager.save(address)

      const addr = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should read invalid address from database', async () => {
      const addr = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(addr).to.be.an('null')
    })

    it('should handle unsupported method', async () => {
      const addr = await client.getEnsAddress({
        name,
        coinType: 1,
        universalResolverAddress,
      })

      expect(addr).to.be.an('null')
    })

    it('should write valid address record onto the database', async () => {
      domain = await datasource.manager.save(domain)

      const response = await offchainWriting({
        encodedName,
        functionName: 'setAddr',
        abi: abiDBResolver,
        args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(address).match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should block unauthorized text change', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setAddr',
        abi: abiDBResolver,
        args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        universalResolverAddress,
        signer: privateKeyToAccount(generatePrivateKey()),
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(twitter).not.eq('0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5')
    })

    it('should handle multicall valid write calls', async () => {
      domain = await datasource.manager.save(domain)

      const calls = [
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setText',
          args: [node, 'com.twitter', '@multicall'],
        }),
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setAddr',
          args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        }),
      ]

      const response = await offchainWriting({
        encodedName,
        functionName: 'multicall',
        abi: abiDBResolver,
        args: [calls],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).eq(200)

      const text = await client.getEnsText({
        name,
        universalResolverAddress,
        key: 'com.twitter',
      })
      expect(text).eq('@multicall')

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })
      expect(address).match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should handle multicall invalid write calls', async () => {
      domain = await datasource.manager.save(domain)

      const calls = [
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setText',
          args: [node, 'com.twitter', '@multicall'],
        }),
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setAddr',
          args: [
            namehash('nonexisting.eth'),
            '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5',
          ],
        }),
      ]

      const response = await offchainWriting({
        encodedName,
        functionName: 'multicall',
        abi: abiDBResolver,
        args: [calls],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).eq(200)

      const text = await client.getEnsText({
        name,
        universalResolverAddress,
        key: 'com.twitter',
      })
      expect(text).eq('@multicall')

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })
      expect(address).eq(null)
    })
  })

  describe('2nd level domain on L1', () => {
    const name = 'l1domain.eth'
    const encodedName = toHex(packetToBytes(name))
    const node = namehash(name)

    it('should set and read contenthash from database', async () => {
      const contentHash =
        'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450'

      const response = await offchainWriting({
        encodedName,
        functionName: 'setContenthash',
        abi: abiDBResolver,
        args: [node, stringToHex(contentHash)],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const [r] = (await client.readContract({
        address: universalResolverAddress as Hex,
        functionName: 'resolve',
        abi: abiUniversalResolver,
        args: [
          toHex(packetToBytes(name)),
          encodeFunctionData({
            abi: abiDBResolver,
            functionName: 'contenthash',
            args: [node],
          }),
        ],
      })) as [Hex]

      const actual = decodeFunctionResult({
        abi: abiDBResolver,
        functionName: 'contenthash',
        data: r,
        args: [node],
      })

      expect(actual).equal(stringToHex(contentHash))
    })

    it('should read the avatar from database', async () => {
      const text = new Text()
      text.domain = node
      text.key = 'avatar'
      text.value = 'ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ'
      text.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const avatar = await client.getEnsAvatar({
        name,
        universalResolverAddress,
      })
      expect(avatar).equal(
        'https://ipfs.io/ipfs/QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ',
      )
    })

    it('should read valid text record from database', async () => {
      const text = new Text()
      text.domain = node
      text.key = 'com.twitter'
      text.value = '@database'
      text.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      text.resolverVersion = '1'
      await datasource.manager.save(text)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).equal('@database')
    })

    it('should write valid text record onto the database', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@blockful'],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).equal('@blockful')
    })

    it('should block unauthorized text change', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@unauthorized'],
        universalResolverAddress,
        signer: privateKeyToAccount(generatePrivateKey()),
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).not.eq('@unauthorized')
    })

    it('should read invalid text record from database', async () => {
      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).to.be.an('null')
    })

    it('should read ETH address from database', async () => {
      const address = new Address()
      address.domain = node
      address.coin = '60'
      address.address = '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'
      address.resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'
      address.resolverVersion = '1'
      await datasource.manager.save(address)

      const addr = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should read invalid address from database', async () => {
      const addr = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(addr).to.be.an('null')
    })

    it('should block writing text record with different chain ID', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setText',
        abi: abiDBResolver,
        args: [node, 'com.twitter', '@blockful'],
        universalResolverAddress,
        signer: owner,
        chainId: sepolia.id,
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsText({
        name,
        key: 'com.twitter',
        universalResolverAddress,
      })

      expect(twitter).eq(null)
    })

    it('should handle unsupported method', async () => {
      const addr = await client.getEnsAddress({
        name,
        coinType: 1,
        universalResolverAddress,
      })

      expect(addr).to.be.an('null')
    })

    it('should write valid address record onto the database', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setAddr',
        abi: abiDBResolver,
        args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(address).match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should block unauthorized text change', async () => {
      const response = await offchainWriting({
        encodedName,
        functionName: 'setAddr',
        abi: abiDBResolver,
        args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        universalResolverAddress,
        signer: privateKeyToAccount(generatePrivateKey()),
      })

      expect(response?.status).equal(401)

      const twitter = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })

      expect(twitter).not.eq('0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5')
    })

    it('should handle multicall valid write calls', async () => {
      const calls = [
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setText',
          args: [node, 'com.twitter', '@multicall'],
        }),
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setAddr',
          args: [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
        }),
      ]

      const response = await offchainWriting({
        encodedName,
        functionName: 'multicall',
        abi: abiDBResolver,
        args: [calls],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).eq(200)

      const text = await client.getEnsText({
        name,
        universalResolverAddress,
        key: 'com.twitter',
      })
      expect(text).eq('@multicall')

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })
      expect(address).match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
    })

    it('should handle multicall invalid write calls', async () => {
      const calls = [
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setText',
          args: [node, 'com.twitter', '@multicall'],
        }),
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setAddr',
          args: [
            namehash('nonexisting.eth'),
            '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5',
          ],
        }),
      ]

      const response = await offchainWriting({
        encodedName,
        functionName: 'multicall',
        abi: abiDBResolver,
        args: [calls],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).eq(200)

      const text = await client.getEnsText({
        name,
        universalResolverAddress,
        key: 'com.twitter',
      })
      expect(text).eq('@multicall')

      const address = await client.getEnsAddress({
        name,
        universalResolverAddress,
      })
      expect(address).eq(null)
    })
  })
})
