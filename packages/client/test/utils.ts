import { ethers as eth } from 'hardhat'
import { Contract, JsonRpcSigner, Wallet } from 'ethers'
import { labelhash, namehash } from 'viem/ens'
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

const root = eth.ZeroHash

// Function to deploy offchain resolver contract
export async function deployOffchainResolver(
  Signer: Wallet,
  gatewayUrl: string,
  signers: string,
): Promise<Contract> {
  const ResolverContract = await new eth.ContractFactory(
    abiOffchainResolver,
    bytecodeOffchainResolver,
    Signer,
  ).deploy(gatewayUrl, signers)

  const offchainResolver = await eth.getContractAt(
    abiOffchainResolver,
    await ResolverContract.getAddress(),
  )
  console.log('Offchain resolver: ', await ResolverContract.getAddress())
  return offchainResolver
}

// Function to deploy registry contract
export async function deployRegistry(
  Signer: Wallet | JsonRpcSigner,
  offchainResolverAddress: string,
): Promise<Contract> {
  const RegistryContract = await new eth.ContractFactory(
    abiRegistry,
    bytecodeRegistry,
    Signer,
  ).deploy()

  const registry = await eth.getContractAt(
    abiRegistry,
    await RegistryContract.getAddress(),
  )
  console.log('Registry: ', await RegistryContract.getAddress())

  await (registry.connect(Signer) as Contract).setSubnodeRecord(
    root,
    labelhash('eth'),
    Signer,
    offchainResolverAddress,
    10000000,
  )
  await (registry.connect(Signer) as Contract).setSubnodeRecord(
    namehash('eth'),
    labelhash('offchain'),
    Signer,
    offchainResolverAddress,
    10000000,
  )
  return registry
}

// Function to deploy universal resolver contract
export async function deployUniversalResolver(
  signer: Wallet | JsonRpcSigner,
  registry: string,
  gatewayUrl: string,
): Promise<void> {
  const UniversalResolverContract = await new eth.ContractFactory(
    abiUniversalResolver,
    bytecodeUniversalResolver,
    signer,
  ).deploy(registry, [gatewayUrl])

  const universalResolver = await eth.getContractAt(
    abiUniversalResolver,
    await UniversalResolverContract.getAddress(),
  )
  console.log('universal resolver: ', await universalResolver.getAddress())
}
