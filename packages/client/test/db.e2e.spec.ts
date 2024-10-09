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
import {
  abi as abiDBResolver,
  bytecode as bytecodeDBResolver,
} from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import {
  abi as abiRegistrar,
  bytecode as bytecodeRegistrar,
} from '@blockful/contracts/out/BaseRegistrarImplementation.sol/BaseRegistrarImplementation.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { DataSource } from 'typeorm'
import { abi } from '@blockful/gateway/src/abi'
import { ChildProcess, spawn } from 'child_process'
import { normalize, labelhash, namehash, packetToBytes } from 'viem/ens'
import { anvil, sepolia } from 'viem/chains'
import {
  createTestClient,
  http,
  publicActions,
  Hash,
  getContractAddress,
  walletActions,
  zeroHash,
  getContract,
  encodeFunctionData,
  Hex,
  PrivateKeyAccount,
  toHex,
} from 'viem'
import { assert, expect } from 'chai'
import { ApolloServer } from '@apollo/server'
import {
  generatePrivateKey,
  privateKeyToAccount,
  privateKeyToAddress,
} from 'viem/accounts'

import * as ccip from '@blockful/ccip-server'
import {
  withGetAddr,
  withGetContentHash,
  withGetText,
  withQuery,
  withSetAddr,
  withSetText,
  withRegisterDomain,
} from '@blockful/gateway/src/handlers'
import {
  DomainData,
  MessageData,
  typeDefs,
  DomainMetadata,
} from '@blockful/gateway/src/types'
import { domainResolver } from '@blockful/gateway/src/resolvers'
import { PostgresRepository } from '@blockful/gateway/src/repositories'
import { Text, Domain, Address } from '@blockful/gateway/src/entities'
import { withSigner } from '@blockful/gateway/src/middlewares'
import {
  EthereumClient,
  OwnershipValidator,
  SignatureRecover,
} from '@blockful/gateway/src/services'
import { getRevertErrorData, handleDBStorage } from '../src/client'

const GATEWAY_URL = 'http://127.0.0.1:3000/{sender}/{data}.json'
const GRAPHQL_URL = 'http://127.0.0.1:4000'

let universalResolverAddress: Hash,
  registryAddr: Hash,
  dbResolverAddr: Hash,
  registrarAddr: Hash

const client = createTestClient({
  chain: anvil,
  mode: 'anvil',
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions)

async function deployContract({
  abi,
  bytecode,
  account,
  args,
}: {
  abi: unknown[]
  bytecode: Hash
  account: Hash
  args?: unknown[]
}): Promise<Hash> {
  const txHash = await client.deployContract({
    abi,
    bytecode,
    account,
    args,
  })

  const { nonce } = await client.getTransaction({
    hash: txHash,
  })

  return await getContractAddress({
    from: account,
    nonce: BigInt(nonce),
  })
}

async function deployContracts(signer: Hash) {
  registryAddr = await deployContract({
    abi: abiRegistry,
    bytecode: bytecodeRegistry.object as Hash,
    account: signer,
  })

  const registry = await getContract({
    abi: abiRegistry,
    address: registryAddr,
    client,
  })

  universalResolverAddress = await deployContract({
    abi: abiUniversalResolver,
    bytecode: bytecodeUniversalResolver.object as Hash,
    account: signer,
    args: [registryAddr, [GATEWAY_URL]],
  })

  registrarAddr = await deployContract({
    abi: abiRegistrar,
    bytecode: bytecodeRegistrar.object as Hash,
    account: signer,
    args: [registryAddr, namehash('eth')],
  })

  dbResolverAddr = await deployContract({
    abi: abiDBResolver,
    bytecode: bytecodeDBResolver.object as Hash,
    account: signer,
    args: [GATEWAY_URL, GRAPHQL_URL, 600, [signer]],
  })

  await registry.write.setSubnodeRecord(
    [zeroHash, labelhash('eth'), signer, dbResolverAddr, 10000000],
    { account: signer },
  )
  await registry.write.setSubnodeRecord(
    [namehash('eth'), labelhash('l1domain'), signer, dbResolverAddr, 10000000],
    { account: signer },
  )
}

function setupGateway(
  privateKey: `0x${string}`,
  { repo }: { repo: PostgresRepository },
) {
  const signatureRecover = new SignatureRecover()
  const ethClient = new EthereumClient(client, registryAddr, registrarAddr)
  const validator = new OwnershipValidator(anvil.id, signatureRecover, [
    ethClient,
    repo,
  ])

  const server = new ccip.Server()
  server.app.use(withSigner(privateKey))

  server.add(
    abi,
    withQuery(),
    withGetText(repo),
    withRegisterDomain(repo),
    withSetText(repo, validator),
    withGetAddr(repo),
    withSetAddr(repo, validator),
    withGetContentHash(repo),
  )
  server.makeApp('/').listen('3000')
}

async function offchainWriting({
  name,
  functionName,
  args,
  signer,
  abi,
  universalResolverAddress,
  chainId,
}: {
  name: string
  functionName: string
  signer: PrivateKeyAccount
  abi: unknown[]
  args: unknown[]
  universalResolverAddress: Hex
  chainId?: number
}): Promise<Response | void> {
  const [resolverAddr] = (await client.readContract({
    address: universalResolverAddress,
    functionName: 'findResolver',
    abi: abiUniversalResolver,
    args: [toHex(packetToBytes(name))],
  })) as Hash[]

  try {
    await client.simulateContract({
      address: resolverAddr,
      abi,
      functionName,
      args,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data?.args as [
        DomainData,
        string,
        MessageData,
      ]

      if (chainId) {
        domain.chainId = chainId
      }
      return await handleDBStorage({ domain, url, message, signer })
    }
  }
}

describe('DatabaseResolver', () => {
  let repo: PostgresRepository, datasource: DataSource
  const owner = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  )
  let localNode: ChildProcess

  before(async () => {
    localNode = spawn('anvil')

    await deployContracts(owner.address)
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new PostgresRepository(await datasource.initialize())
    setupGateway(
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      { repo },
    )
  })

  beforeEach(async () => {
    for (const entity of ['Text', 'Address', 'Domain']) {
      await datasource.getRepository(entity).clear()
    }
  })

  after(async () => {
    localNode.kill()
    await datasource.destroy()
  })

  describe('Subdomain created on database', async () => {
    const name = normalize('database.eth')
    const node = namehash(name)
    const resolver = '0x6AEBB4AdC056F3B01d225fE34c20b1FdC21323A2'

    beforeEach(async () => {
      let domain = new Domain()
      domain.node = node
      domain.name = name
      domain.parent = namehash('eth')
      domain.resolver = resolver
      domain.resolverVersion = '1'
      domain.owner = owner.address
      domain.ttl = '300'
      domain = await datasource.manager.save(domain)
    })

    it('should register new domain', async () => {
      const name = normalize('newdomain.eth')
      const dnsName = toHex(packetToBytes(name))
      const node = namehash(name)
      const response = await offchainWriting({
        name,
        functionName: 'register',
        abi: abiDBResolver,
        args: [
          dnsName,
          owner.address,
          300n,
          zeroHash,
          resolver,
          [],
          false,
          0,
          zeroHash,
        ],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const actual = await datasource.getRepository(Domain).countBy({
        node,
        owner: owner.address,
      })
      expect(actual).eq(1)
    })

    it('should register new domain with records', async () => {
      const name = normalize('newdomain.eth')
      const dnsName = toHex(packetToBytes(name))
      const node = namehash(name)
      const calldata = [
        encodeFunctionData({
          abi: abiDBResolver,
          functionName: 'setText',
          args: [node, 'com.twitter', '@blockful.eth'],
        }),
        encodeFunctionData({
          functionName: 'setAddr',
          abi: abiDBResolver,
          args: [node, '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a0'],
        }),
        encodeFunctionData({
          functionName: 'setAddr',
          abi: abiDBResolver,
          args: [node, 1n, '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a2'],
        }),
      ]
      const response = await offchainWriting({
        name,
        functionName: 'register',
        abi: abiDBResolver,
        args: [
          dnsName,
          owner.address,
          300n,
          zeroHash,
          resolver,
          calldata,
          false,
          0,
          zeroHash,
        ],
        universalResolverAddress,
        signer: owner,
      })

      expect(response?.status).equal(200)

      const d = await datasource.getRepository(Domain).countBy({
        node,
        owner: owner.address,
      })
      expect(d).eq(1)

      const actualText = await datasource.getRepository(Text).existsBy({
        domain: node,
        key: 'com.twitter',
      })
      expect(actualText).eq(true)
      const actualAddress = await datasource.getRepository(Address).existsBy({
        domain: node,
        address: '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a0',
        coin: '60',
      })
      expect(actualAddress).eq(true)
      const actualAddressWithCoin = await datasource
        .getRepository(Address)
        .existsBy({
          domain: node,
          address: '0x3a872f8fed4421e7d5be5c98ab5ea0e0245169a2',
          coin: '1',
        })
      expect(actualAddressWithCoin).eq(true)
    })

    it('should block register of duplicated domain with same owner', async () => {
      const dnsName = toHex(packetToBytes(name))
      const response = await offchainWriting({
        name,
        functionName: 'register',
        abi: abiDBResolver,
        args: [
          dnsName,
          owner.address,
          300n,
          zeroHash,
          resolver,
          [],
          false,
          0,
          zeroHash,
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
      const newOwner = privateKeyToAccount(generatePrivateKey())
      const dnsName = toHex(packetToBytes(name))
      const response = await offchainWriting({
        name,
        functionName: 'register',
        abi: abiDBResolver,
        args: [
          dnsName,
          newOwner.address,
          300n,
          zeroHash,
          resolver,
          [],
          false,
          0,
          zeroHash,
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
      const name = normalize('newdomain.eth')
      const dnsName = toHex(packetToBytes(name))
      const node = namehash(name)
      const response = await offchainWriting({
        name,
        functionName: 'register',
        abi: abiDBResolver,
        args: [
          dnsName,
          newOwner,
          300n,
          zeroHash,
          resolver,
          [],
          false,
          0,
          zeroHash,
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
      const response = await offchainWriting({
        name,
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
        name,
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
        name,
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
      const response = await offchainWriting({
        name,
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
        name,
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
        name,
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
        name,
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
    const name = normalize('l1domain.eth')
    const node = namehash(name)

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
        name,
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
        name,
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
        name,
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
        name,
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
        name,
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
        name,
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
        name,
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

    describe('Metadata API', async () => {
      let server: ApolloServer

      before(async () => {
        const ethClient = new EthereumClient(
          client,
          registryAddr,
          registrarAddr,
        )
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
      })

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
        expect(actual.resolver.address).equal(dbResolverAddr)
        expect(actual.resolver.addr).equal('0x2')
        expect(actual.resolver.contentHash).equal(null)
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
        expect(subdomain.resolver).to.have.property(
          'id',
          `${d.owner}-${d.node}`,
        )
        expect(subdomain.resolver).to.have.property('node', d.node)
        expect(subdomain.resolver).to.have.property('context', d.owner)
        expect(subdomain.resolver).to.have.property('address', d.resolver)
        expect(subdomain.resolver).to.have.property('addr', '0x1')
        expect(subdomain.resolver).to.have.property(
          'contentHash',
          d.contenthash,
        )
        expect(subdomain.resolver.texts).to.eql([
          { key: t.key, value: t.value },
        ])
        expect(subdomain.resolver.addresses).to.eql([
          { address: a.address, coin: a.coin },
        ])
      })
    })
  })
})
