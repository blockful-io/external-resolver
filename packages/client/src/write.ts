/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import { Hash, createPublicClient, http, namehash, toHex } from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as dbABI } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as uABI } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { DomainData, MessageData } from '@blockful/gateway/src/types'

import { getRevertErrorData, handleOffchainStorage } from './client'

const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
  )

program.parse(process.argv)

const { resolver, provider, chainId, privateKey } = program.opts()

const signer = privateKeyToAccount(privateKey)

function getChain(chainId: number) {
  for (const chain of Object.values(chains)) {
    if ('id' in chain && chain.id === chainId) {
      return chain
    }
  }
}

const chain = getChain(parseInt(chainId))

console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('blockful.eth')

  const [resolverAddr] = (await client.readContract({
    address: resolver,
    functionName: 'findResolver',
    abi: uABI,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'register',
      abi: dbABI,
      args: [namehash(publicAddress), 9999999999n],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleOffchainStorage({ domain, url, message, signer })
    } else {
      console.log('writing failed', err)
    }
  }

  // SET TEXT
  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'setText',
      abi: dbABI,
      args: [namehash(publicAddress), 'com.twitter', '@xxx_blockful.eth'],
    })
  } catch (err) {
    const data = getRevertErrorData(err)

    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]

      await handleOffchainStorage({ domain, url, message, signer })
    } else {
      console.log('writing failed', err)
    }
  }
})()
