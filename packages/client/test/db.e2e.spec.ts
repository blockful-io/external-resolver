/*
  This test script (e2e.spec.ts) aims to perform integrated testing of the project. It executes a series of actions,
  including deploying the contracts (registry, offchain resolver, and universal resolver), creating the Client using Viem, 
  and initializing the gateway locally. After deploying and configuring the contracts, the Client can access
  off-chain information during the tests. It's important to note that this initial test script only sets up the
  environment and stops at the gateway call. It still requires implementing the connection between the gateway and 
  layer two, or the gateway and the database.
*/

// Importing abi and bytecode from contracts folder
import {
  abi as abiDBResolver,
  bytecode as bytecodeDBResolver,
} from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import { abi as abiTextResolver } from '@blockful/contracts/out/TextResolver.sol/TextResolver.json'
import { abi as abiAddrResolver } from '@blockful/contracts/out/AddrResolver.sol/AddrResolver.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

import { normalize, labelhash, namehash, packetToBytes } from 'viem/ens'
import { anvil } from 'viem/chains'
import {
  Hash,
  createTestClient,
  getContract,
  getContractAddress,
  http,
  publicActions,
  zeroHash,
  walletActions,
  Address,
  Hex,
  encodeFunctionData,
  toHex,
  PrivateKeyAccount,
} from 'viem'
import { expect } from 'chai'

import { NewApp } from '@blockful/gateway/src/app'
import {
  withGetAddr,
  withGetContentHash,
  withGetText,
  withQuery,
  withSetAddr,
  withSetText,
  withRegisterDomain,
} from '@blockful/gateway/src/handlers'
import { InMemoryRepository } from '@blockful/gateway/src/repositories'
import { withSigner } from '@blockful/gateway/src/middlewares'
import { OwnershipValidator } from '@blockful/gateway/src/services'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { getRevertErrorData, ccipRequest } from '../src/write'

const GATEWAY_URL = 'http://127.0.0.1:3000/{sender}/{data}.json'

let offchainResolverAddr: Hash, universalResolverAddress: Hash

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
  // exec('anvil')

  const registryAddr = await deployContract({
    abi: abiRegistry,
    bytecode: bytecodeRegistry.object as Hash,
    account: signer,
  })

  universalResolverAddress = await deployContract({
    abi: abiUniversalResolver,
    bytecode: bytecodeUniversalResolver.object as Hash,
    account: signer,
    args: [registryAddr, [GATEWAY_URL]],
  })

  offchainResolverAddr = await deployContract({
    abi: abiDBResolver,
    bytecode: bytecodeDBResolver.object as Hash,
    account: signer,
    args: [GATEWAY_URL, [signer]],
  })

  const registry = await getContract({
    abi: abiRegistry,
    address: registryAddr,
    client,
  })

  await registry.write.setSubnodeRecord(
    [zeroHash, labelhash('eth'), signer, offchainResolverAddr, 10000000],
    {
      account: signer,
    },
  )

  await registry.write.setSubnodeRecord(
    [
      namehash('eth'),
      labelhash('blockful'),
      signer,
      offchainResolverAddr,
      10000000,
    ],
    {
      account: signer,
    },
  )
}

function setupGateway(
  privateKey: `0x${string}`,
  { repo }: { repo: InMemoryRepository },
) {
  const validator = new OwnershipValidator(repo)
  const app = NewApp(
    [
      withQuery(),
      withGetText(repo),
      withRegisterDomain(repo, validator),
      withSetText(repo, validator),
      withGetAddr(repo),
      withSetAddr(repo, validator),
      withGetContentHash(repo),
    ],
    [
      withSigner(privateKey, [
        'function text(bytes32 node, string key)',
        'function addr(bytes32 node)',
        'function contenthash(bytes32 node)',
      ]),
    ],
  )
  app.listen('3000')
}

async function offchainWriting({
  node,
  functionName,
  args,
  signer,
  abi,
  universalResolverAddress,
}: {
  node: string
  functionName: string
  signer: PrivateKeyAccount
  abi: unknown[]
  args: unknown[]
  universalResolverAddress: Hex
}): Promise<Response | void> {
  const [resolverAddr] = (await client.readContract({
    address: universalResolverAddress,
    functionName: 'findResolver',
    abi: abiUniversalResolver,
    args: [toHex(packetToBytes(node))],
  })) as Hash[]

  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'write',
      abi: abiDBResolver,
      args: [
        encodeFunctionData({
          abi,
          functionName,
          args,
        }),
      ],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [sender, url, callData] = data?.args as [Hex, string, Hex]

      const signature = await signer.signMessage({ message: { raw: callData } })

      return await ccipRequest({
        body: { data: callData, signature, sender },
        url,
      })
    }
  }
}

describe('DatabaseResolver', () => {
  let repo: InMemoryRepository
  const rawNode = 'database.eth'
  const node = namehash(rawNode)
  const domains = new Map()
  const owner = privateKeyToAccount(generatePrivateKey())
  const domain = {
    node,
    owner: owner.address,
    ttl: 99712622115,
    addresses: [],
    texts: [],
  }
  domains.set(node, domain)
  let account: Address

  before(async () => {
    const [signer] = await client.getAddresses()
    account = signer
    await deployContracts(account)

    repo = new InMemoryRepository()
    setupGateway(
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      { repo },
    )
  })

  beforeEach(() => {
    repo.setDomains(domains)
    repo.setTexts([])
    repo.setAddresses([])
  })

  it('should read and parse the avatar from database', async () => {
    repo.setTexts([
      {
        domain,
        key: 'avatar',
        value: 'ipfs://QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ',
      },
    ])
    const avatar = await client.getEnsAvatar({
      name: normalize(rawNode),
      universalResolverAddress,
    })
    expect(avatar).equal(
      'https://ipfs.io/ipfs/QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ',
    )
  })

  it('should read valid text record from database', async () => {
    repo.setTexts([
      {
        domain,
        key: 'com.twitter',
        value: '@database',
      },
    ])
    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress,
    })

    expect(twitter).equal('@database')
  })

  it('should write valid text record onto the database', async () => {
    const response = await offchainWriting({
      node: normalize(rawNode),
      functionName: 'setText',
      abi: abiTextResolver,
      args: [namehash(rawNode), 'com.twitter', '@blockful'],
      universalResolverAddress,
      signer: owner,
    })

    expect(response?.status).equal(200)

    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress,
    })

    expect(twitter).equal('@blockful')
  })

  it('should block unauthorized text change', async () => {
    const response = await offchainWriting({
      node: normalize(rawNode),
      functionName: 'setText',
      abi: abiTextResolver,
      args: [namehash(rawNode), 'com.twitter', '@unauthorized'],
      universalResolverAddress,
      signer: privateKeyToAccount(generatePrivateKey()),
    })

    expect(response?.status).equal(401)

    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress,
    })

    expect(twitter).not.eq('@unauthorized')
  })

  it('should read invalid text record from database', async () => {
    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress,
    })

    expect(twitter).to.be.an('null')
  })

  it('should read ETH address from database', async () => {
    repo.setAddresses([
      {
        domain,
        coin: 60,
        address: '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5',
      },
    ])
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress,
    })

    expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })

  it('should read invalid address from database', async () => {
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress,
    })

    expect(addr).to.be.an('null')
  })

  it('should handle unsupported method', async () => {
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      coinType: 1,
      universalResolverAddress,
    })

    expect(addr).to.be.an('null')
  })

  it('should write valid address record onto the database', async () => {
    const response = await offchainWriting({
      node: normalize(rawNode),
      functionName: 'setAddr',
      abi: abiAddrResolver,
      args: [namehash(rawNode), '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
      universalResolverAddress,
      signer: owner,
    })

    expect(response?.status).equal(200)

    const address = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress,
    })

    expect(address).match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })

  it('should block unauthorized text change', async () => {
    const response = await offchainWriting({
      node: normalize(rawNode),
      functionName: 'setAddr',
      abi: abiAddrResolver,
      args: [namehash(rawNode), '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
      universalResolverAddress,
      signer: privateKeyToAccount(generatePrivateKey()),
    })

    expect(response?.status).equal(401)

    const twitter = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress,
    })

    expect(twitter).not.eq('0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5')
  })
})
