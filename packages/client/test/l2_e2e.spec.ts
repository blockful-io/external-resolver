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
} from '../../contracts/out/OffchainResolver.sol/OffchainResolver.json'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '../../contracts/out/ENSRegistry.sol/ENSRegistry.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '../../contracts/out/UniversalResolver.sol/UniversalResolver.json'

import { ethers as eth } from 'hardhat'
import { BaseContract, Contract, Wallet, HashZero } from 'ethers'
import { normalize, labelhash, namehash } from 'viem/ens'
import { localhost } from 'viem/chains'
import { createTestClient, http, publicActions } from 'viem'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
// import { expect } from 'chai'

// Creating an example of Bytes32 variable to represent the Node.
const root = eth.ZeroHash

let offchainResolver: Contract
let registry: Contract
let universalResolver: Contract
let UniversalResolverContract: BaseContract
const gatewayUrl = 'http://127.0.0.1:3001'

// signers
let signers: HardhatEthersSigner[]

// Providers
const l2Provider = new eth.JsonRpcProvider('http://127.0.0.1:8547')
const l1Provider = new eth.JsonRpcProvider('http://127.0.0.1:8545')
const devAccountPrivateKey =
  '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659'
const devAccountPublicKey = '0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E'

// Function to deploy offchain resolver contract
async function deployOffchainResolver(): Promise<void> {
  const walletForL2 = new Wallet(devAccountPrivateKey)
  const l2Signer = walletForL2.connect(l2Provider)

  const ResolverContract = await new eth.ContractFactory(
    abiOffchainResolver,
    bytecodeOffchainResolver,
    l2Signer,
  ).deploy(gatewayUrl, signers)

  offchainResolver = await eth.getContractAt(
    abiOffchainResolver,
    await ResolverContract.getAddress(),
  )
  console.log('Offchain resolver: ', await ResolverContract.getAddress())
}

// Function to deploy registry contract
async function deployRegistry(): Promise<void> {
  const l1Signer = await l1Provider.getSigner(devAccountPublicKey)
  const RegistryContract = await new eth.ContractFactory(
    abiRegistry,
    bytecodeRegistry,
    l1Signer,
  ).deploy()

  registry = await eth.getContractAt(
    abiRegistry,
    await RegistryContract.getAddress(),
  )
  console.log('Registry: ', await RegistryContract.getAddress())

  await (registry.connect(l1Signer) as Contract).setSubnodeRecord(
    root,
    labelhash('eth'),
    l1Signer,
    await offchainResolver.getAddress(),
    10000000,
  )
  await (registry.connect(l1Signer) as Contract).setSubnodeRecord(
    namehash('eth'),
    labelhash('offchain'),
    l1Signer,
    await offchainResolver.getAddress(),
    10000000,
  )
}

// Function to deploy universal resolver contract
async function deployUniversalResolver(): Promise<void> {
  const l1Signer = await l1Provider.getSigner(devAccountPublicKey)

  UniversalResolverContract = await new eth.ContractFactory(
    abiUniversalResolver,
    bytecodeUniversalResolver,
    l1Signer,
  ).deploy(await registry.getAddress(), [gatewayUrl])

  universalResolver = await eth.getContractAt(
    abiUniversalResolver,
    await UniversalResolverContract.getAddress(),
  )
  console.log('universal resolver: ', await universalResolver.getAddress())
}

describe('SeuContrato', () => {
  before(async () => {
    const offSigs = await l2Provider.listAccounts()
    console.log(offSigs)
    const s = await l1Provider._detectNetwork()
    console.log(s)

    console.log('Inside before.')
    signers = await eth.getSigners()
    // Deploying the contracts
    await deployOffchainResolver()
    await deployRegistry()
    await deployUniversalResolver()
  })

  /*
   This test will fail when it reach the gateway
   because the offchain part is not implemented yet.
  */
  it('Call ENS flow with viem.', async () => {
    // ENS address
    const ensAddress = normalize('public.eth')
    // Getting Avatar from the ens address
    const client = createTestClient({
      chain: localhost,
      mode: 'hardhat',
      transport: http('http://127.0.0.1:8545'),
    }).extend(publicActions)

    //   console.log('ok!')
    //   try {
    //     await client.getEnsAvatar({
    //       name: ensAddress,
    //       universalResolverAddress:
    //         (await UniversalResolverContract.getAddress()) as `0x${string}`,
    //     })
    //   } catch (error) {
    //     const customError = error as BaseError
    //     console.log(customError.message)
    //     // expect(customError.message).contain('HTTP request failed')
    //   }
  })
})
