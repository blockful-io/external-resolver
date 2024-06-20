/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import {
  Hash,
  createPublicClient,
  getChainContractAddress,
  http,
  namehash,
  toHex,
  walletActions,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { abi as l2Abi } from '@blockful/contracts/out/L2Resolver.sol/L2Resolver.json'
import { abi as uAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { getRevertErrorData, handleL2Storage, getChain } from './client'

const program = new Command()
program
  .option('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option(
    '-pl2 --providerL2 <url>',
    'web3 provider URL for layer2',
    'http://127.0.0.1:8547',
  )
  .option('-i --chainId <chainId>', 'chainId', '1337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659', // local arbitrum PK
  )
  .option('-l2r --l2resolver <l2resolver>', 'l2resolver')

program.parse(process.argv)

const { provider, providerL2, chainId, privateKey, l2resolver } = program.opts()
let { resolver } = program.opts()

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
}).extend(walletActions)

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('blockful.eth')
  const signer = privateKeyToAccount(privateKey)

  if (!resolver) {
    resolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const [resolverAddr] = (await client.readContract({
    address: resolver,
    functionName: 'findResolver',
    abi: uAbi,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    const { request } = await client.simulateContract({
      functionName: 'register',
      abi: l1Abi,
      args: [toHex(packetToBytes(publicAddress)), l2resolver],
      address: resolverAddr,
      account: signer,
    })
    await client.writeContract(request)

    await client.simulateContract({
      functionName: 'setOwner',
      abi: l1Abi,
      args: [toHex(packetToBytes(publicAddress)), signer.address],
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByL2') {
      const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

      await handleL2Storage({
        chainId,
        l2Url: providerL2,
        args: {
          functionName: 'setOwner',
          abi: l2Abi,
          args: [namehash(publicAddress), signer.address],
          address: contractAddress,
          account: signer,
        },
      })
    } else if (data) {
      console.error('error registering domain: ', data.errorName)
    } else {
      console.error('error registering domain: ', { err })
    }
  }

  // SET TEXT
  try {
    await client.simulateContract({
      functionName: 'setText',
      abi: l1Abi,
      args: [toHex(packetToBytes(publicAddress)), 'com.twitter', '@blockful'],
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByL2') {
      const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

      await handleL2Storage({
        chainId,
        l2Url: providerL2,
        args: {
          functionName: 'setText',
          abi: l2Abi,
          args: [namehash(publicAddress), 'com.twitter', '@blockful'],
          address: contractAddress,
          account: signer,
        },
      })
    } else if (data) {
      console.error('error setting text: ', data.errorName)
    } else {
      console.error('error setting text: ', { err })
    }
  }

  // SET ADDRESS
  try {
    await client.simulateContract({
      functionName: 'setAddr',
      abi: l1Abi,
      args: [
        toHex(packetToBytes(publicAddress)),
        '0x04270c4366010A52192bC8D3E29d9f0E21bBe969',
      ],
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByL2') {
      const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

      await handleL2Storage({
        chainId,
        l2Url: providerL2,
        args: {
          functionName: 'setAddr',
          abi: l2Abi,
          args: [
            namehash(publicAddress),
            '0x04270c4366010A52192bC8D3E29d9f0E21bBe969',
          ],
          address: contractAddress,
          account: signer,
        },
      })
    } else if (data) {
      console.error('error setting addr: ', data.errorName)
    } else {
      console.error('error setting addr: ', { err })
    }
  }
})()
