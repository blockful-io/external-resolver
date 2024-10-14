/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Address,
  Hex,
  createPublicClient,
  http,
  namehash,
  toHex,
  getChainContractAddress,
  decodeFunctionResult,
  hexToString,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { getChain } from './client'
import { abi as dbAbi } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as uAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

config({
  path: process.env.ENV_FILE || '../.env',
})

const {
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  GATEWAY_URL: gateway = 'http://127.0.0.1:3000/{sender}/{data}.json',
} = process.env
let { UNIVERSAL_RESOLVER_ADDRESS: universalResolverAddress } = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('blockful.eth')

  if (!universalResolverAddress) {
    universalResolverAddress = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const twitter = await client.getEnsText({
    name: publicAddress,
    key: 'com.twitter',
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const avatar = await client.getEnsAvatar({
    name: publicAddress,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })

  const address = await client.getEnsAddress({
    name: publicAddress,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const addressBtc = await client.getEnsAddress({
    name: publicAddress,
    coinType: 1,
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })
  const name = await client.getEnsName({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    universalResolverAddress: universalResolverAddress as Hex,
    gatewayUrls: [gateway],
  })

  const [resolverAddr] = (await client.readContract({
    address: universalResolverAddress as Hex,
    functionName: 'findResolver',
    abi: uAbi,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Address[]

  const encodedContentHash = (await client.readContract({
    address: resolverAddr,
    functionName: 'contenthash',
    args: [namehash(publicAddress)],
    abi: dbAbi,
  })) as Hex

  const contentHash = hexToString(
    decodeFunctionResult({
      abi: dbAbi,
      functionName: 'contenthash',
      data: encodedContentHash,
    }) as Hex,
  )

  console.log({
    twitter,
    avatar,
    address,
    addressBtc,
    name,
    contentHash,
  })
})()
