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
  deployOffchainResolver,
  deployRegistry,
  deployUniversalResolver,
} from './utils'
import { ethers as eth } from 'hardhat'
import { Wallet } from 'ethers'
import { normalize } from 'viem/ens'
import { localhost } from 'viem/chains'
import { createTestClient, http, publicActions } from 'viem'
const gatewayUrl = 'http://127.0.0.1:3000'

// Providers
const l2Provider = new eth.JsonRpcProvider('http://127.0.0.1:8547')
const l1Provider = new eth.JsonRpcProvider('http://127.0.0.1:8545')
const devAccountPrivateKey =
  '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659'
const devAccountPublicKey = '0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E'

describe('SeuContrato', () => {
  before(async () => {
    const signers = await eth.getSigners()

    const walletForL2 = new Wallet(devAccountPrivateKey)
    const l2Signer = walletForL2.connect(l2Provider)
    const l1Signer = await l1Provider.getSigner(devAccountPublicKey)

    // Deploying the contracts
    const offchainResolverContract = await deployOffchainResolver(
      l2Signer,
      gatewayUrl,
      signers as unknown as string,
    )

    const RegistryContract = await deployRegistry(
      l1Signer,
      await offchainResolverContract.getAddress(),
    )

    await deployUniversalResolver(
      l1Signer,
      await RegistryContract.getAddress(),
      gatewayUrl,
    )
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
