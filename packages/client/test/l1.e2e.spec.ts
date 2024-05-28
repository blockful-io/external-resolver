/*
  This test script (e2e.spec.ts) aims to perform integrated testing of the project. It executes a series of actions,
  including deploying the contracts (registry, offchain resolver, and universal resolver), creating the Client using Viem, 
  and initializing the gateway locally. After deploying and configuring the contracts, the Client can access
  off-chain information during the tests. It's important to note that this initial test script only sets up the
  environment and stops at the gateway call. It still requires implementing the connection between the gateway and 
  layer two, or the gateway and the database.
*/

import { ChildProcess, spawn } from 'child_process'
// Importing abi and bytecode from contracts folder
import {
  abi as abiL1Resolver,
  bytecode as bytecodeL1Resolver,
} from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import {
  abi as abiOffchainResolver,
  bytecode as bytecodeOffchainResolver,
} from '@blockful/contracts/out/OffchainResolver.sol/OffchainResolver.json'
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

import { normalize, labelhash, namehash } from 'viem/ens'
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
import { expect } from 'chai'

import { L1ProofService } from '@blockful/gateway/src/services'
import { NewApp } from '@blockful/gateway/src/app'
import { withGetStorageSlot, withQuery } from '@blockful/gateway/src/handlers'

const GATEWAY_URLS = ['http://127.0.0.1:3000/{sender}/{data}.json']

let l1Resolver: GetContractReturnType<
  typeof abiL1Resolver,
  { wallet: WalletClient }
>
let offchainResolverAddr: Hash, universalResolverAddr: Hash

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

  offchainResolverAddr = await deployContract({
    abi: abiOffchainResolver,
    bytecode: bytecodeOffchainResolver.object as Hash,
    account: signer,
    args: [verifier, registryAddr, nameWrapper],
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

function setupGateway() {
  const app = NewApp(
    [withQuery(), withGetStorageSlot(new L1ProofService(client))],
    [],
  )
  app.listen('3000')
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

    const l1ResolverAddr = await deployContract({
      abi: abiL1Resolver,
      bytecode: bytecodeL1Resolver.object as Hash,
      account: signer,
    })

    l1Resolver = await getContract({
      abi: abiL1Resolver,
      address: l1ResolverAddr,
      client,
    })

    const offchainResolver = await getContract({
      abi: abiOffchainResolver,
      address: offchainResolverAddr,
      client: {
        wallet: client,
      },
    })

    await client.impersonateAccount({ address: signer })
    await offchainResolver.write.setTarget(
      [namehash('blockful.eth'), l1ResolverAddr],
      {
        account: signer,
      },
    )
  })

  it('should read valid text record', async () => {
    await l1Resolver.write.setText([node, 'com.twitter', '@database'], {
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
    const twitter = await client.getEnsText({
      name: normalize(rawNode),
      key: 'com.twitter',
      universalResolverAddress: universalResolverAddr,
    })

    expect(twitter).to.be.an('null')
  })

  it('should read ETH address', async () => {
    await l1Resolver.write.setAddr(
      [node, '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5'],
      { account },
    )
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })
    expect(addr).to.match(/0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5/i)
  })

  it('should read invalid address', async () => {
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      universalResolverAddress: universalResolverAddr,
    })

    expect(addr).to.be.an('null')
  })

  it('should handle unsupported method', async () => {
    const addr = await client.getEnsAddress({
      name: normalize(rawNode),
      coinType: 1,
      universalResolverAddress: universalResolverAddr,
    })

    expect(addr).to.be.an('null')
  })
})
