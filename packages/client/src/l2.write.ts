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
  parseEther,
  toHex,
  walletActions,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as uAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { abi } from '@blockful/contracts/out/OffchainDomains.sol/OffchainDomains.json'
import { abi as l1Abi } from '@blockful/contracts/out/L1Resolver.sol/L1Resolver.json'
import { getRevertErrorData, getChain } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

let {
  UNIVERSAL_RESOLVER_ADDRESS: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  LAYER2_RPC: providerL2 = 'http://127.0.0.1:8547',
  PRIVATE_KEY:
    privateKey = '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659', // local arbitrum PK
} = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
}).extend(walletActions)

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('lucas.arb.eth')
  const node = namehash(publicAddress)
  const signer = privateKeyToAccount(privateKey as Hex)

  if (!resolver) {
    resolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const [resolverAddr] = (await client.readContract({
    address: resolver as Hex,
    functionName: 'findResolver',
    abi: uAbi,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  const secret = `0x${'a'.repeat(64)}` as Hex
  const l2Account = privateKeyToAccount(
    '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659',
  )

  const data: Hex[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: l1Abi,
      args: [node, 'com.twitter', '@blockful.eth'],
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
  const args = [
    publicAddress, // name
    l2Account.address, // owner
    31556952000n, // duration
    secret, // secret
    resolverAddr, // resolver
    data, // calldata
    false, // primaryName
    0, // fuses
  ]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      functionName: 'register',
      abi,
      args,
      address: resolverAddr,
      account: signer,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByL2') {
      const [chainId, contractAddress] = data.args as [bigint, `0x${string}`]

      const chain = getChain(Number(chainId))
      const l2Client = createPublicClient({
        chain,
        transport: http(providerL2),
      }).extend(walletActions)

      try {
        const { request } = await l2Client.simulateContract({
          abi,
          functionName: 'register',
          address: contractAddress,
          account: signer,
          value: parseEther('0.01'),
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
