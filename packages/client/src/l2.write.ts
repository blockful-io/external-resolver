/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Hex,
  createPublicClient,
  encodeFunctionData,
  http,
  namehash,
  stringToHex,
  toHex,
  walletActions,
} from 'viem'
import { normalize } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { getRevertErrorData, getChain } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

const {
  UNIVERSAL_RESOLVER_ADDRESS: resolver,
  L2_RESOLVER_ADDRESS: l2Resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  L2_RPC_URL: providerL2 = 'http://127.0.0.1:8547',
  PRIVATE_KEY: privateKey,
} = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
}).extend(walletActions)

// eslint-disable-next-line
const _ = (async () => {
  if (!l2Resolver) {
    throw new Error('L2_RESOLVER_ADDRESS is required')
  }

  const signer = privateKeyToAccount(privateKey as Hex)
  const name = normalize('lucas.arb.eth')
  const node = namehash(name)
  const label = extractLabelFromName(name)
  const duration = 31556952000n

  const resolverAddr = await client.getEnsResolver({
    name,
    universalResolverAddress: resolver as Hex,
  })

  // SUBDOMAIN PRICING

  const [value /* commitTime */ /* extraData */, ,] =
    (await client.readContract({
      address: resolverAddr,
      abi: l1Abi,
      functionName: 'registerParams',
      args: [toHex(label), duration],
    })) as [bigint, bigint, Hex]

  // REGISTER NEW SUBDOMAIN

  const data: Hex[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: l1Abi,
      args: [node, 'com.twitter', `@${label}`],
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
    encodeFunctionData({
      functionName: 'setContenthash',
      abi: l1Abi,
      args: [
        node,
        stringToHex(
          'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450',
        ),
      ],
    }),
  ]

  const calldata = {
    functionName: 'register',
    abi: l1Abi,
    args: [
      label,
      signer.address, // owner
      duration,
      `0x${'a'.repeat(64)}` as Hex, // secret
      l2Resolver, // resolver
      data, // calldata
      false, // primaryName
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
    if (data?.errorName === 'StorageHandledByL2') {
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
    } else if (data) {
      console.error('error registering domain: ', data.errorName)
    } else {
      console.error('error registering domain: ', { err })
    }
  }
})()

// gather the first part of the domain (e.g. floripa.blockful.eth -> floripa)
function extractLabelFromName(name: string): string {
  const [, label] = /^(\w+)/.exec(name) || []
  return label
}
