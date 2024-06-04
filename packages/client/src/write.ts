/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import { Hash, createPublicClient, http, namehash, toHex } from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { MessageData, DomainData } from '@blockful/gateway/src/types'
import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { abi as l2Abi } from '@blockful/contracts/out/L2Resolver.sol/L2Resolver.json'
import { abi as uABI } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import {
  getRevertErrorData,
  handleL2Storage,
  handleDBStorage,
  getChain,
} from './client'

const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option(
    '-pl2 --providerl2 <url>',
    'web3 provider URL for layer2',
    'http://127.0.0.1:8547',
  )
  .option('-i --chainId <chainId>', 'chainId', '31337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
  )
  .option('-l2r --l2resolver <l2resolver>', 'l2resolver')

program.parse(process.argv)

const { resolver, provider, providerL2, chainId, privateKey, l2resolver } =
  program.opts()

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('floripa.eth')
  const signer = privateKeyToAccount(privateKey)

  const [resolverAddr] = (await client.readContract({
    address: resolver,
    functionName: 'findResolver',
    abi: uABI,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      functionName: 'register',
      abi: l1Abi,
      args: [toHex(packetToBytes(publicAddress)), l2resolver],
      account: signer.address,
      address: resolverAddr,
    })
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
        break
      }
      case 'StorageHandledByL2': {
        const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

        handleL2Storage({
          chainId,
          l2Url: providerL2,
          args: {
            functionName: 'register',
            abi: l2Abi,
            args: [namehash(publicAddress)],
            address: contractAddress,
            account: signer.address,
          },
        })
        break
      }
      default:
        console.error({ err })
    }
  }

  // SET TEXT

  try {
    await client.simulateContract({
      functionName: 'setText',
      abi: l1Abi,
      args: [
        toHex(packetToBytes(publicAddress)),
        'com.twitter',
        '@xxx_blockful.eth',
      ],
      address: resolverAddr,
    })
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
        break
      }
      case 'StorageHandledByL2': {
        const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

        handleL2Storage({
          chainId,
          l2Url: providerL2,
          args: {
            functionName: 'setText',
            abi: l2Abi,
            args: [
              namehash(normalize(publicAddress)),
              'com.twitter',
              '@tartaruga.eth',
            ],
            address: contractAddress,
            account: signer.address,
          },
        })

        break
      }
      default:
        console.error({ err })
    }
  }
})()
