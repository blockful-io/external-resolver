import {
  createTestClient,
  getContract,
  getContractAddress,
  Hash,
  Hex,
  http,
  labelhash,
  namehash,
  publicActions,
  walletActions,
  zeroHash,
} from 'viem'
import {
  abi as abiRegistry,
  bytecode as bytecodeRegistry,
} from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import {
  abi as abiRegistrar,
  bytecode as bytecodeRegistrar,
} from '@blockful/contracts/out/BaseRegistrarImplementation.sol/BaseRegistrarImplementation.json'
import {
  abi as abiDBResolver,
  bytecode as bytecodeDBResolver,
} from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import {
  abi as abiUniversalResolver,
  bytecode as bytecodeUniversalResolver,
} from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { anvil } from 'viem/chains'
import {
  EthereumClient,
  OwnershipValidator,
  SignatureRecover,
} from '@blockful/gateway/src/services'
import { withSigner } from '@blockful/gateway/src/middlewares'
import { abi } from '@blockful/gateway/src/abi'
import {
  withQuery,
  withGetText,
  withRegisterDomain,
  withSetText,
  withGetAddr,
  withSetAddr,
  withGetContentHash,
  withSetContentHash,
} from '@blockful/gateway/src/handlers'
import { PostgresRepository } from '@blockful/gateway/src/repositories'
import * as ccip from '@blockful/ccip-server'

const GATEWAY_URL = 'http://127.0.0.1:3000/{sender}/{data}.json'
const GRAPHQL_URL = 'http://127.0.0.1:4000'

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

export async function deployContracts(signer: Hash) {
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

  const universalResolverAddr = await deployContract({
    abi: abiUniversalResolver,
    bytecode: bytecodeUniversalResolver.object as Hash,
    account: signer,
    args: [registryAddr, [GATEWAY_URL]],
  })

  const registrarAddr = await deployContract({
    abi: abiRegistrar,
    bytecode: bytecodeRegistrar.object as Hash,
    account: signer,
    args: [registryAddr, namehash('eth')],
  })

  const dbResolverAddr = await deployContract({
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

  return {
    registryAddr,
    universalResolverAddr,
    registrarAddr,
    dbResolverAddr,
  }
}

export function setupGateway(
  privateKey: Hex,
  { repo }: { repo: PostgresRepository },
  registryAddr: Hex,
  registrarAddr: Hex,
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
    withSetContentHash(repo, validator),
  )
  server.makeApp('/').listen('3000')
}
