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
  zeroHash,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { MessageData, DomainData } from '@blockful/gateway/src/types'
import { getRevertErrorData, getChain, handleDBStorage } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

const {
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

  const duration = 31556952000n

  const resolverAddr = await client.getEnsResolver({
    name,
    universalResolverAddress: universalResolver as Hex,
  })

  // SUBDOMAIN PRICING

  let value = 0n
  try {
    const [_value /* commitTime */ /* extraData */, ,] =
      (await client.readContract({
        address: resolverAddr,
        abi: l1Abi,
        functionName: 'registerParams',
        args: [toHex(name), duration],
      })) as [bigint, bigint, Hex]
    value = _value
  } catch {
    // interface not implemented by the resolver
  }

  // REGISTER NEW SUBDOMAIN

  const data: Hex[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: l1Abi,
      args: [node, 'com.twitter', `@${name}`],
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
      encodedName,
      signer.address, // owner
      duration,
      zeroHash,
      resolver,
      data, // records calldata
      false, // reverseRecord
      0, // fuses
      zeroHash,
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
      case 'StorageHandledByOffChainDatabase': {
        const [domain, url, message] = data.args as [
          DomainData,
          string,
          MessageData,
        ]
        await handleDBStorage({ domain, url, message, signer })
        return
      }
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
