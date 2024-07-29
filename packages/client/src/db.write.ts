/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Hash,
  Hex,
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

config({
  path: process.env.ENV_FILE || '../.env',
})

let {
  UNIVERSAL_RESOLVER: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  PRIVATE_KEY:
    privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
} = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('blockful.eth')
  const signer = privateKeyToAccount(privateKey as Hex)

  if (!resolver) {
    resolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const [resolverAddr] = (await client.readContract({
    address: resolver as Hex,
    functionName: 'findResolver',
    abi: uAbi,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      functionName: 'register',
      abi: dbAbi,
      args: [namehash(publicAddress), 300],
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
      args: [namehash(publicAddress), 'com.twitter', '@blockful.eth'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [
        namehash(publicAddress),
        '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0',
      ],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [
        namehash(publicAddress),
        1n,
        '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0',
      ],
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
