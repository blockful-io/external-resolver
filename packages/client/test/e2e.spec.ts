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
import { BaseContract, Contract } from 'ethers'
import { normalize, labelhash, namehash } from 'viem/ens'
import { localhost } from 'viem/chains'
import { createTestClient, http, publicActions, BaseError } from 'viem'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'

const gatewayUrl = 'http://127.0.0.1:3001'
// Creating an example of Bytes32 variable to represent the Node.
const root =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

let offchainResolver: Contract
let registry: Contract
let universalResolver: Contract
let UniversalResolverContract: BaseContract
// signers
let signers: HardhatEthersSigner[]

// Function to deploy offchain resolver contract
async function deployOffchainResolver(): Promise<void> {
  const ResolverContract = await new eth.ContractFactory(
    abiOffchainResolver,
    bytecodeOffchainResolver,
    signers[0],
  ).deploy(gatewayUrl, signers)

  offchainResolver = await eth.getContractAt(
    abiOffchainResolver,
    await ResolverContract.getAddress(),
  )

  console.log('Offchain resolver: ', await ResolverContract.getAddress())
}

// Function to deploy registry contract
async function deployRegistry(): Promise<void> {
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
    await offchainResolver.getAddress(),
    10000000,
  )
  await registry.setSubnodeRecord(
    namehash('eth'),
    labelhash('offchain'),
    signers[0],
    await offchainResolver.getAddress(),
    10000000,
  )
}

// Function to deploy universal resolver contract
async function deployUniversalResolver(): Promise<void> {
  UniversalResolverContract = await new eth.ContractFactory(
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

describe('SeuContrato', () => {
  before(async () => {
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
      transport: http(),
    }).extend(publicActions)

    try {
      await client.getEnsAvatar({
        name: ensAddress,
        universalResolverAddress:
          (await UniversalResolverContract.getAddress()) as `0x${string}`,
      })
    } catch (error) {
      const customError = error as BaseError
      console.log(customError.message)
      expect(customError.message).contain('HTTP request failed')
    }
  })
})
