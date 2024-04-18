/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv'

// Define command-line options using Commander
const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', process.env.LAYER_ONE_RPC)
  .option('-i --chainId <chainId>', 'chainId', process.env.CHAIN_ID)

program.parse(process.argv)

const { provider } = program.opts()
dotenv.config({ debug: false })

const client = createPublicClient({
  chain: sepolia, // use anvil for local RPCs
  transport: http(provider),
})
const universalAddress = process.env.L1_UNIVERSAL_RESOLVER as `0x${string}`

// eslint-disable-next-line
const _ = (async () => {
  const databaseAddress = normalize('layer2.eth')

  const dbTwitter = await client.getEnsText({
    name: databaseAddress,
    key: 'com.twitter',
    universalResolverAddress: universalAddress,
  })

  const dbAddress = await client.getEnsAddress({
    name: databaseAddress,
    universalResolverAddress: universalAddress,
  })

  const avatar = await client.getEnsAvatar({
    name: databaseAddress,
    universalResolverAddress: universalAddress,
  })

  console.log('Layer 2 resolver: ', {
    dbTwitter,
    avatar,
    dbAddress,
  })
})()
