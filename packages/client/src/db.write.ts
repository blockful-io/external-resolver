/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import {
  Hash,
  createPublicClient,
  encodeFunctionData,
  getChainContractAddress,
  http,
  namehash,
  toHex,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { MessageData, DomainData } from '@blockful/gateway/src/types'
import { abi as dbAbi } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as uAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { getRevertErrorData, handleDBStorage, getChain } from './client'

const program = new Command()
program
  .option('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
  )

program.parse(process.argv)

const { provider, chainId, privateKey } = program.opts()
let { resolver } = program.opts()

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const name = normalize('jorge.blockful.eth')
  const node = namehash(name)
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
    args: [toHex(packetToBytes(name))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      functionName: 'register',
      abi: dbAbi,
      args: [toHex(name), 300],
      account: signer.address,
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleDBStorage({ domain, url, message, signer })
    } else {
      console.error('writing failed: ', { err })
    }
  }

  // WRITING CALLS IN BATCH

  const calls: Hash[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: dbAbi,
      args: [node, 'com.twitter', '@blockful.eth'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [node, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [node, 1n, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
  ]

  try {
    await client.simulateContract({
      functionName: 'multicall',
      abi: dbAbi,
      args: [calls],
      account: signer.address,
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleDBStorage({ domain, url, message, signer, multicall: true })
    } else {
      console.error('writing failed: ', { err })
    }
  }
})()
