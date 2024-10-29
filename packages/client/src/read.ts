/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Hex,
  createPublicClient,
  http,
  namehash,
  decodeFunctionResult,
  hexToString,
} from 'viem'
import { normalize } from 'viem/ens'
import { getChain } from './client'
import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
config({
  path: process.env.ENV_FILE || '../.env',
})

const {
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  GATEWAY_URL: gateway = 'http://127.0.0.1:3000/{sender}/{data}.json',
  UNIVERSAL_RESOLVER_ADDRESS: universalResolverAddress,
} = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const name = normalize('lucas.arb.eth')

  const twitter = await client.getEnsText({
    name,
    key: 'com.twitter',
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const avatar = await client.getEnsAvatar({
    name,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })

  const address = await client.getEnsAddress({
    name,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const addressBtc = await client.getEnsAddress({
    name,
    coinType: 1,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const domainName = await client.getEnsName({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })

  const resolver = await client.getEnsResolver({
    name,
    universalResolverAddress: universalResolverAddress as Hex,
  })
  const encodedContentHash = (await client.readContract({
    address: resolver,
    functionName: 'contenthash',
    abi: l1Abi,
    args: [namehash(name)],
  })) as Hex

  const contentHash = hexToString(
    decodeFunctionResult({
      abi: l1Abi,
      functionName: 'contenthash',
      data: encodedContentHash,
    }) as Hex,
  )

  console.log({
    twitter,
    avatar,
    address,
    addressBtc,
    name: domainName,
    contentHash,
  })
})()
