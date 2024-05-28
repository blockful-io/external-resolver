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
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

import { ChildProcess, spawn } from 'child_process'
import { normalize, labelhash, namehash, packetToBytes } from 'viem/ens'
import { anvil } from 'viem/chains'
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
import { DomainData, MessageData } from '@blockful/gateway/src/types'
import { InMemoryRepository } from '@blockful/gateway/src/repositories'
import { withSigner } from '@blockful/gateway/src/middlewares'
import { OwnershipValidator } from '@blockful/gateway/src/services'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { getRevertErrorData, ccipRequest } from '../src/client'

const GATEWAY_URL = 'http://127.0.0.1:3000/{sender}/{data}.json'

let universalResolverAddress: Hash

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
  const registryAddr = await deployContract({
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

  const dbResolverAddr = await deployContract({
    abi: abiDBResolver,
    bytecode: bytecodeDBResolver.object as Hash,
    account: signer,
    args: [GATEWAY_URL, 600, [signer]],
  })

  await registry.write.setSubnodeRecord(
    [zeroHash, labelhash('eth'), signer, dbResolverAddr, 10000000],
    { account: signer },
  )
  await registry.write.setSubnodeRecord(
    [namehash('eth'), labelhash('offchain'), signer, dbResolverAddr, 10000000],
    { account: signer },
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
      abi,
      functionName,
      args,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]

      const signature = await signer.signTypedData({
        domain,
        message,
        types: {
          Message: [
            { name: 'functionSelector', type: 'bytes4' },
            { name: 'sender', type: 'address' },
            { name: 'parameters', type: 'Parameter[]' },
            { name: 'expirationTimestamp', type: 'uint256' },
          ],
          Parameter: [
            { name: 'name', type: 'string' },
            { name: 'value', type: 'string' },
          ],
        },
        primaryType: 'Message',
      })

      const callData = encodeFunctionData({
        abi,
        functionName: message.functionSelector,
        args: message.parameters.map((arg) => arg.value),
      })
      return await ccipRequest({
        body: {
          data: callData,
          signature: { message, domain, signature },
          sender: signer.address,
        },
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
  let localNode: ChildProcess

  before(async () => {
    localNode = spawn('anvil')

    const [signer] = await client.getAddresses()
    await deployContracts(signer)

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

  after(async () => {
    localNode.kill()
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
      abi: abiDBResolver,
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
      abi: abiDBResolver,
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
      abi: abiDBResolver,
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
      abi: abiDBResolver,
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
