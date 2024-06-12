/* eslint-disable @typescript-eslint/no-unused-vars */
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
  abi as abiL2Resolver,
  bytecode as bytecodeL2Resolver,
} from '@blockful/contracts/out/L2Resolver.sol/L2Resolver.json'
import {
  abi as abiL1Resolver,
  bytecode as bytecodeL1Resolver,
} from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import {
  abi as abiDummyNameWrapper,
  bytecode as bytecodeDummyNameWrapper,
} from '@blockful/contracts/out/DummyNameWrapper.sol/DummyNameWrapper.json'
import {
  abi as abiL1Verifier,
  bytecode as bytecodeL1Verifier,
} from '@blockful/contracts/out/L1Verifier.sol/L1Verifier.json'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import * as ccip from '@blockful/ccip-server'
import { normalize, labelhash, namehash, packetToBytes } from 'viem/ens'
import { ChildProcess, spawn } from 'child_process'
import { anvil } from 'viem/chains'
import {
  Address,
  GetContractReturnType,
  Hash,
  WalletClient,
  createTestClient,
  getContract,
  getContractAddress,
  http,
  publicActions,
  toHex,
  walletActions,
  zeroHash,
  createPublicClient,
  TestClient,
  createWalletClient,
  Client,
  PublicClient,
} from 'viem'
import { abi } from '@blockful/gateway/src/abi'
import { expect } from 'chai'
import * as chains from 'viem/chains'
import { InMemoryBlockCache } from '@blockful/gateway/src/services/InMemoryBlockCache'

// import { L1ProofService } from '@blockful/gateway/src/services'
import { ArbProofService } from '@blockful/gateway/src/services'

import { withGetStorageSlot, withQuery } from '@blockful/gateway/src/handlers'
import { privateKeyToAccount } from 'viem/accounts'

const GATEWAY_URLS = ['http://127.0.0.1:3000/{sender}/{data}.json']

let l2Resolver: GetContractReturnType<
  typeof abiL2Resolver,
  { wallet: WalletClient }
>
let l1Resolver: GetContractReturnType<
  typeof abiL1Resolver,
  { wallet: WalletClient }
>
let universalResolverAddr: Hash

// const clientL1 = createPublicClient({
//   chain: chains.mainnet,
//   transport: http('http://127.0.0.1:8545'),
// })
//   .extend(walletActions)
//   .extend(publicActions)

const clientL1 = createTestClient({
  account: privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ),
  chain: chains.mainnet,
  mode: 'anvil',
  transport: http('http://127.0.0.1:8545'),
})
  .extend(walletActions)
  .extend(publicActions)

const clientL2 = createTestClient({
  account: privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ),
  chain: chains.arbitrum,
  mode: 'anvil',
  transport: http('http://127.0.0.1:8547'),
})
  .extend(walletActions)
  .extend(publicActions)

async function deployContract({
  abi,
  bytecode,
  account,
  args,
  client,
}: {
  abi: unknown[]
  bytecode: Hash
  account: Hash
  args?: unknown[]
  client: WalletClient
}): Promise<Hash> {
  const txHash = await clientL1.deployContract({
    abi,
    bytecode,
    account,
    args,
  })

  const { nonce } = await clientL1.getTransaction({
    hash: txHash,
  })

  return await getContractAddress({
    from: account,
    nonce: BigInt(nonce),
  })
  // return '0x0'
}

async function deployContracts(signer: Hash) {
  try {
    const registryAddr = await deployContract({
      abi: abiRegistry,
      bytecode: bytecodeRegistry.object as Hash,
      account: signer,
      client: clientL1,
    })

    universalResolverAddr = await deployContract({
      abi: abiUniversalResolver,
      bytecode: bytecodeUniversalResolver.object as Hash,
      account: signer,
      args: [registryAddr, GATEWAY_URLS],
      client: clientL1,
    })

    const nameWrapper = await deployContract({
      abi: abiDummyNameWrapper,
      bytecode: bytecodeDummyNameWrapper.object as Hash,
      account: signer,
      client: clientL1,
    })

    const verifier = await deployContract({
      abi: abiL1Verifier,
      bytecode: bytecodeL1Verifier.object as Hash,
      account: signer,
      args: [GATEWAY_URLS],
      client: clientL1,
    })

    const l1ResolverAddr = await deployContract({
      abi: abiL1Resolver,
      bytecode: bytecodeL1Resolver.object as Hash,
      account: signer,
      args: [anvil.id, verifier, registryAddr, nameWrapper],
      client: clientL1,
    })

    l1Resolver = await getContract({
      abi: abiL1Resolver,
      address: l1ResolverAddr,
      client: {
        wallet: clientL1,
      },
    })

    const registry = await getContract({
      abi: abiRegistry,
      address: registryAddr,
      client: clientL1,
    })

    await registry.write.setSubnodeRecord(
      [zeroHash, labelhash('eth'), signer, l1ResolverAddr, 9999999999],
      {
        account: signer,
      },
    )

    await registry.write.setSubnodeRecord(
      [
        namehash('eth'),
        labelhash('blockful'),
        signer,
        l1ResolverAddr,
        9999999999,
      ],
      {
        account: signer,
      },
    )
  } catch (err) {
    console.error('Error deploying contracts: ', err)
  }
}

function getChain(chainId: number): chains.Chain {
  return (
    Object.values(chains).find((chain) => chain?.id === chainId) ||
    chains.localhost
  )
}

function setupGateway() {
  const rollupAddr = '0x5eF0D09d1E6204141B4d37530808eD19f60FBa35'
  console.debug(`rollupAddr:  ${rollupAddr}`)

  const chain1 = getChain(1)
  console.debug(`layer 1: ${chain1.name}`)

  const chain2 = getChain(42161)
  console.debug(`layer 2: ${chain2.name}`)

  const provider = createPublicClient({
    chain: chain1,
    transport: http('http://127.0.0.1:8545'),
  })
  const providerL2 = createPublicClient({
    chain: chain2,
    transport: http('http://127.0.0.1:8547'),
  })

  const proofService = new ArbProofService(
    provider,
    providerL2,
    rollupAddr as Hash,
    new InMemoryBlockCache(),
  )

  const server = new ccip.Server()
  server.add(abi, withQuery(), withGetStorageSlot(proofService))
  server.makeApp('/').listen('3000')
}

describe('L1Resolver', () => {
  const rawNode = 'blockful.eth'
  const node = namehash(rawNode)
  let account: Address
  let localNode: ChildProcess
  let arbNode: ChildProcess

  before(async () => {
    localNode = spawn(
      'anvil',
      [
        '--port',
        '8545',
        '--fork-url',
        'https://mainnet.infura.io/v3/c4dea56c64a74a8c9d35dbee81a1afd2',
        '--fork-block-number',
        '20063805',
        '--chain-id',
        '1',
      ],
      { stdio: 'inherit' },
    )
    arbNode = spawn(
      'anvil',
      [
        '--port',
        '8547',
        '--fork-url',
        'https://arb1.arbitrum.io/rpc',
        // '--fork-block-number',
        // '220502303',
        '--chain-id',
        '42161',
      ],
      { stdio: 'inherit' },
    )

    const [signer] = await clientL1.getAddresses()
    // console.debug('signer:', signer)

    // setTimeout(async () => {
    //   console.log('sleep')
    // }, 10000)

    // eslint-disable-next-line promise/param-names
    await new Promise((r) => setTimeout(r, 5000))

    await deployContracts('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

    setupGateway()
  })

  after(async () => {
    localNode.kill()
    arbNode.kill()
  })

  beforeEach(async () => {
    const [signer] = await clientL1.getAddresses()
    console.log('signer: ', signer)

    const l2ResolverAddr = await deployContract({
      abi: abiL2Resolver,
      bytecode: bytecodeL2Resolver.object as Hash,
      account: signer,
      client: clientL2,
    })
    console.log('beforeEach')
    l2Resolver = await getContract({
      abi: abiL2Resolver,
      address: l2ResolverAddr,
      client: clientL2,
    })

    await clientL1.impersonateAccount({ address: signer })
    await l1Resolver.write.setTarget([namehash(rawNode), l2ResolverAddr], {
      account: signer,
    })
  })

  it('should read valid text record', async () => {
    await l2Resolver.write.setText([node, 'com.twitter', '@layer2'], {
      account,
    })
    const twitter = await clientL1.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress: universalResolverAddr,
    })
    expect(twitter).equal('@layer2')
  })

  it('should read invalid text record', async () => {
    await l2Resolver.write.setText([node, 'com.twitter', '@database'], {
      account,
    })
    const twitter = await clientL1.getEnsText({
      name: normalize(rawNode),
      key: 'com.x',
      universalResolverAddress: universalResolverAddr,
    })

    expect(twitter).to.equal(null)
  })

  it('should read invalid address', async () => {
    const addr = await clientL1.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })

    expect(addr).to.equal(null)
  })

  it('should read ETH address', async () => {
    await l2Resolver.write.setAddr(
      [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
      { account },
    )
    const addr = await clientL1.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })
    expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })

  // it('should do nothing for now.', async () => {
  //   const nothing: boolean = true
  //   expect(nothing).equal(true)
  // })
})
