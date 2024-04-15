/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { anvil } from 'viem/chains'

// Define command-line options using Commander
const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')

program.parse(process.argv)

const { provider } = program.opts()

const client = createPublicClient({
  chain: anvil,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const databaseAddress = normalize('layer2.eth')

  const dbTwitter = await client.getEnsText({
    name: databaseAddress,
    key: 'com.twitter',
    universalResolverAddress: '0xB74201731dA171E3276344B3aFDeCB86361F9f99',
  })

  const dbAddress = await client.getEnsAddress({
    name: databaseAddress,
    universalResolverAddress: '0xB74201731dA171E3276344B3aFDeCB86361F9f99',
  })

  const avatar = await client.getEnsAvatar({
    name: databaseAddress,
    universalResolverAddress: '0xB74201731dA171E3276344B3aFDeCB86361F9f99',
  })

  console.log('Layer 2 resolver: ', {
    dbTwitter,
    avatar,
    dbAddress,
  })
})()
