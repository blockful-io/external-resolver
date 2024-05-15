/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import {
  AbiFunction,
  BaseError,
  ContractFunctionRevertedError,
  Hash,
  Hex,
  createPublicClient,
  encodeFunctionData,
  http,
  namehash,
  toHex,
  Address,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import { abi as dbABI } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as uABI } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

const program = new Command()
program
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')
  .option('-pk --privateKey <privateKey>', 'privateKey')

program.parse(process.argv)

const { resolver, provider, chainId, privateKey } = program.opts()

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

export const DBResolverAbi: AbiFunction[] = [
  {
    name: 'register',
    type: 'function',
    inputs: [
      { name: 'name', type: 'bytes32' },
      { name: 'ttl', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'setText',
    type: 'function',
    inputs: [
      { name: 'name', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
]

// eslint-disable-next-line
const _ = (async () => {
  const publicAddress = normalize('blockful.eth')

  const [resolverAddr] = (await client.readContract({
    address: resolver,
    functionName: 'findResolver',
    abi: uABI,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'write',
      abi: dbABI,
      args: [
        encodeFunctionData({
          abi: DBResolverAbi,
          functionName: 'register',
          args: [namehash(publicAddress), 99999999n],
        }),
      ],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [sender, url, callData] = data?.args as [Hex, string, Hex]
      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: callData } })

      await ccipRequest({
        body: { data: callData, signature, sender },
        url,
      })
    }
  }

  // SET TEXT
  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'write',
      abi: dbABI,
      args: [
        encodeFunctionData({
          abi: DBResolverAbi,
          functionName: 'setText',
          args: [namehash(publicAddress), 'com.twitter', '@blockful.eth'],
        }),
      ],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [sender, url, callData] = data?.args as [Hex, string, Hex]
      const signer = privateKeyToAccount(privateKey)
      const signature = await signer.signMessage({ message: { raw: callData } })

      await ccipRequest({
        body: { data: callData, signature, sender },
        url,
      })
    }
  }
})()

function getRevertErrorData(err: unknown) {
  if (!(err instanceof BaseError)) return undefined
  const error = err.walk() as ContractFunctionRevertedError
  return error.data
}

type CcipRequestParameters = {
  body: { data: Hex; signature: Hex; sender: Address }
  url: string
}

export async function ccipRequest({ body, url }: CcipRequestParameters) {
  await fetch(url.replace('/{sender}/{data}.json', ''), {
    body: JSON.stringify(body),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
