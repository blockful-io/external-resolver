/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import { Hex, createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { getChain } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

const {
  UNIVERSAL_RESOLVER_ADDRESS: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  GATEWAY_URL: gateway = 'http://127.0.0.1:3000/{sender}/{data}.json',
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

  const twitter = await client.getEnsText({
    name: publicAddress,
    key: 'com.twitter',
    universalResolverAddress: resolver as Hex,
    gatewayUrls: [gateway],
  })
  const avatar = await client.getEnsAvatar({
    name: publicAddress,
    universalResolverAddress: resolver as Hex,
    gatewayUrls: [gateway],
  })

  const address = await client.getEnsAddress({
    name: publicAddress,
    universalResolverAddress: resolver as Hex,
    gatewayUrls: [gateway],
  })
  const addressBtc = await client.getEnsAddress({
    name: publicAddress,
    coinType: 1,
    universalResolverAddress: resolver as Hex,
    gatewayUrls: [gateway],
  })
  const name = await client.getEnsName({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    universalResolverAddress: resolver as Hex,
    gatewayUrls: [gateway],
  })

  console.log({
    twitter,
    avatar,
    address,
    addressBtc,
    name,
  })
})()
