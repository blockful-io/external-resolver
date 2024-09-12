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
} from '@blockful/contracts/out/PublicResolver.sol/PublicResolver.json'
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
import { normalize, labelhash, namehash } from 'viem/ens'
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
  walletActions,
  zeroHash,
} from 'viem'
import { abi } from '@blockful/gateway/src/abi'
import { expect } from 'chai'

import { L1ProofService } from '@blockful/gateway/src/services'
import { withGetStorageSlot, withQuery } from '@blockful/gateway/src/handlers'

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

const client = createTestClient({
  chain: anvil,
  mode: 'anvil',
  transport: http(),
})
  .extend(walletActions)
  .extend(publicActions)

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

  universalResolverAddr = await deployContract({
    abi: abiUniversalResolver,
    bytecode: bytecodeUniversalResolver.object as Hash,
    account: signer,
    args: [registryAddr, GATEWAY_URLS],
  })

  const nameWrapper = await deployContract({
    abi: abiDummyNameWrapper,
    bytecode: bytecodeDummyNameWrapper.object as Hash,
    account: signer,
  })

  const verifier = await deployContract({
    abi: abiL1Verifier,
    bytecode: bytecodeL1Verifier.object as Hash,
    account: signer,
    args: [GATEWAY_URLS],
  })

  const l1ResolverAddr = await deployContract({
    abi: abiL1Resolver,
    bytecode: bytecodeL1Resolver.object as Hash,
    account: signer,
    args: [anvil.id, verifier, registryAddr, nameWrapper],
  })

  l1Resolver = await getContract({
    abi: abiL1Resolver,
    address: l1ResolverAddr,
    client: {
      wallet: client,
    },
  })

  const registry = await getContract({
    abi: abiRegistry,
    address: registryAddr,
    client,
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
}

function setupGateway() {
  const server = new ccip.Server()
  server.add(abi, withQuery(), withGetStorageSlot(new L1ProofService(client)))
  server.makeApp('/').listen('3000')
}

describe('L1Resolver', () => {
  const rawNode = 'blockful.eth'
  const node = namehash(rawNode)
  let account: Address
  let localNode: ChildProcess

  before(async () => {
    localNode = spawn('anvil')

    const [signer] = await client.getAddresses()
    account = signer

    await deployContracts(signer)

    setupGateway()
  })

  after(async () => {
    localNode.kill()
  })

  beforeEach(async () => {
    const [signer] = await client.getAddresses()

    const l2ResolverAddr = await deployContract({
      abi: abiL2Resolver,
      bytecode: bytecodeL2Resolver.object as Hash,
      account: signer,
    })

    l2Resolver = await getContract({
      abi: abiL2Resolver,
      address: l2ResolverAddr,
      client,
    })

    await client.impersonateAccount({ address: signer })
    await l1Resolver.write.setTarget([namehash(rawNode), l2ResolverAddr], {
      account: signer,
    })
  })

  it('should read valid text record', async () => {
    await l2Resolver.write.setText([node, 'com.twitter', '@database'], {
      account,
    })
    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress: universalResolverAddr,
    })
    expect(twitter).equal('@database')
  })

  it('should read invalid text record', async () => {
    await l2Resolver.write.setText([node, 'com.twitter', '@database'], {
      account,
    })
    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.x',
      universalResolverAddress: universalResolverAddr,
    })

    expect(twitter).to.equal(null)
  })

  it('should read invalid address', async () => {
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })

    expect(addr).to.equal(null)
  })

  it('should read ETH address', async () => {
    await l2Resolver.write.setAddr(
      [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
      {
        account,
      },
    )
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })
    expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })
})
