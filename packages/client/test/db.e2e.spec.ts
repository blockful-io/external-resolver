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
  abi as abiOffchainResolver,
  bytecode as bytecodeOffchainResolver,
} from '@blockful/contracts/out/OffchainResolver.sol/OffchainResolver.json'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

import { ethers as eth } from 'hardhat'
import { Contract } from 'ethers'
import { normalize, labelhash, namehash } from 'viem/ens'
import { localhost } from 'viem/chains'
import { createTestClient, http, publicActions } from 'viem'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'

import { NewApp } from '@blockful/gateway/src/app'
import {
  withGetAddr,
  withGetContentHash,
  withGetText,
} from '@blockful/gateway/src/handlers'
import { InMemoryRepository } from '@blockful/gateway/src/repositories'
import { withSigner } from '@blockful/gateway/src/middlewares'

const gatewayUrl = 'http://127.0.0.1:3000/{sender}/{data}.json'
// Creating an example of Bytes32 variable to represent the Node.
const root =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

let dbResolver: Contract,
  registry: Contract,
  universalResolver: Contract,
  signers: HardhatEthersSigner[]

const client = createTestClient({
  chain: localhost,
  mode: 'hardhat',
  transport: http(),
}).extend(publicActions)

async function deployOffchainResolver() {
  const ResolverContract = await new eth.ContractFactory(
    abiOffchainResolver,
    bytecodeOffchainResolver,
    signers[0],
  ).deploy(gatewayUrl, signers)

  dbResolver = await eth.getContractAt(
    abiOffchainResolver,
    await ResolverContract.getAddress(),
  )

  console.log('Offchain resolver: ', await ResolverContract.getAddress())
}

async function deployRegistry() {
  const RegistryContract = await new eth.ContractFactory(
    abiRegistry,
    bytecodeRegistry,
    signers[0],
  ).deploy()

  registry = await eth.getContractAt(
    abiRegistry,
    await RegistryContract.getAddress(),
  )
  console.log('Registry: ', await RegistryContract.getAddress())

  await registry.setSubnodeRecord(
    root,
    labelhash('eth'),
    signers[0],
    await dbResolver.getAddress(),
    10000000,
  )
  await registry.setSubnodeRecord(
    namehash('eth'),
    labelhash('offchain'),
    signers[0],
    await dbResolver.getAddress(),
    10000000,
  )
}

async function deployUniversalResolver() {
  const UniversalResolverContract = await new eth.ContractFactory(
    abiUniversalResolver,
    bytecodeUniversalResolver,
    signers[0],
  ).deploy(await registry.getAddress(), [gatewayUrl])

  universalResolver = await eth.getContractAt(
    abiUniversalResolver,
    await UniversalResolverContract.getAddress(),
  )
  console.log('universal resolver: ', await universalResolver.getAddress())
}

function setupGateway(
  privateKey: `0x${string}`,
  { repo }: { repo: InMemoryRepository },
) {
  const app = NewApp(
    [withGetText(repo), withGetAddr(repo), withGetContentHash(repo)],
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

describe('DatabaseResolver', () => {
  let repo: InMemoryRepository
  const rawNode = 'database.eth'
  const node = namehash(rawNode)
  const domains = new Map()
  const domain = {
    node,
    ttl: 99712622115,
    addresses: [],
    texts: [],
  }
  domains.set(node, domain)

  before(async () => {
    signers = await eth.getSigners()

    // Deploying the contracts
    await deployOffchainResolver()
    await deployRegistry()
    await deployUniversalResolver()

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
      universalResolverAddress:
        (await universalResolver.getAddress()) as `0x${string}`,
    })
    expect(avatar).equal(
      'https://ipfs.io/ipfs/QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ',
    )
  })

  it('should read com.twitter text record from database', async () => {
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
      universalResolverAddress:
        (await universalResolver.getAddress()) as `0x${string}`,
    })

    expect(twitter).equal('@database')
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
      universalResolverAddress:
        (await universalResolver.getAddress()) as `0x${string}`,
    })

    expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })
})
