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
  walletActions,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as uAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { getRevertErrorData, getChain } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

let {
  UNIVERSAL_RESOLVER_ADDRESS: universalResolver,
  RESOLVER_ADDRESS: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  L2_RPC_URL: providerL2 = 'http://127.0.0.1:8547',
  PRIVATE_KEY: privateKey,
} = process.env

const chain = getChain(parseInt(chainId))
if (!chain) {
  throw new Error('Chain not found')
}

const client = createPublicClient({
  chain,
  transport: http(provider),
}).extend(walletActions)
console.log(`Connecting to ${chain?.name}.`)

// eslint-disable-next-line
const _ = (async () => {
  if (!resolver) {
    throw new Error('RESOLVER_ADDRESS is required')
  }

  const name = normalize('gibi.arb.eth')
  const encodedName = toHex(packetToBytes(name))
  const node = namehash(name)
  const signer = privateKeyToAccount(privateKey as Hex)

  if (!universalResolver) {
    universalResolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const [resolverAddr] = (await client.readContract({
    address: universalResolver as Hex,
    functionName: 'findResolver',
    abi: uAbi,
    args: [encodedName],
  })) as Hash[]

  const duration = 31556952000n

  // SUBDOMAIN PRICING

  const [value /* commitTime */ /* extraData */, ,] =
    (await client.readContract({
      address: resolverAddr,
      abi: l1Abi,
      functionName: 'registerParams',
      args: [toHex(name), duration],
    })) as [bigint, bigint, Hex]

  // REGISTER NEW SUBDOMAIN

  const data: Hex[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: l1Abi,
      args: [node, 'com.twitter', '@lucas'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: l1Abi,
      args: [node, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: l1Abi,
      args: [node, 1n, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
  ]

  const calldata = {
    functionName: 'register',
    abi: l1Abi,
    args: [
      encodedName, // name
      signer.address, // owner
      duration,
      `0x${'a'.repeat(64)}` as Hex, // secret
      resolver,
      data, // records calldata
      false, // reverseRecord
      0, // fuses
      `0x${'a'.repeat(64)}` as Hex, // extraData
    ],
    address: resolverAddr,
    account: signer,
    value,
  }

  try {
    await client.simulateContract(calldata)
  } catch (err) {
    const data = getRevertErrorData(err)
    switch (data?.errorName) {
      case 'StorageHandledByL2': {
        const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

        const l2Client = createPublicClient({
          chain: getChain(Number(chainId)),
          transport: http(providerL2),
        }).extend(walletActions)

        try {
          const { request } = await l2Client.simulateContract({
            ...calldata,
            address: contractAddress,
          })
          await l2Client.writeContract(request)
        } catch (err) {
          console.log('error while trying to make the request: ', { err })
        }
        return
      }
      default:
        console.error('error registering domain: ', { err })
    }
  }
})()
