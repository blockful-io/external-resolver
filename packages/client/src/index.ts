/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import * as chains from 'viem/chains'
import { config } from 'dotenv'

// Define command-line options using Commander
const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')

program.parse(process.argv)

const { resolver, provider, chainId } = program.opts()

config({
  path: process.env.ENV_FILE || '../.env',
})

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

  const twitter = await client.getEnsText({
    name: publicAddress,
    key: 'com.twitter',
    universalResolverAddress: resolver,
  })
  const avatar = await client.getEnsAvatar({
    name: publicAddress,
    universalResolverAddress: resolver,
  })
  const address = await client.getEnsAddress({
    name: publicAddress,
    universalResolverAddress: resolver,
  })
  const name = await client.getEnsName({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    universalResolverAddress: resolver,
  })

  console.log({
    twitter,
    avatar,
    name,
    address,
  })
})()
