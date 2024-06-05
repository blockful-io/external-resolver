/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { Command } from 'commander'
import {
  BaseError,
  Hash,
  Hex,
  createPublicClient,
  http,
  namehash,
  toHex,
  Address,
  RawContractError,
  encodeFunctionData,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import * as chains from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

import {
  MessageData,
  DomainData,
  TypedSignature,
} from '@blockful/gateway/src/types'
import { abi as dbABI } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as uABI } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'

const program = new Command()
program
  .option('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '1337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
  )

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
      functionName: 'register',
      abi: dbABI,
      args: [namehash(publicAddress), 9999999999n],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleOffchainStorage({ domain, url, message })
    }
  }

  // SET TEXT
  try {
    await client.simulateContract({
      address: resolverAddr,
      functionName: 'setText',
      abi: dbABI,
      args: [namehash(publicAddress), 'com.twitter', '@xxx_blockful.eth'],
    })
  } catch (err) {
    const data = getRevertErrorData(err)

    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleOffchainStorage({ domain, url, message })
    }
  }
})()

async function handleOffchainStorage({
  domain,
  url,
  message,
}: {
  domain: DomainData
  url: string
  message: MessageData
}) {
  const signer = privateKeyToAccount(privateKey)

  const signature = await signer.signTypedData({
    domain,
    message,
    types: {
      Message: [
        { name: 'functionSelector', type: 'bytes4' },
        { name: 'sender', type: 'address' },
        { name: 'parameters', type: 'Parameter[]' },
        { name: 'expirationTimestamp', type: 'uint256' },
      ],
      Parameter: [
        { name: 'name', type: 'string' },
        { name: 'value', type: 'string' },
      ],
    },
    primaryType: 'Message',
  })

  const callData = encodeFunctionData({
    abi: dbABI,
    functionName: message.functionSelector,
    args: message.parameters.map((arg) => arg.value),
  })
  await ccipRequest({
    body: {
      data: callData,
      signature: { message, domain, signature },
      sender: message.sender,
    },
    url,
  })
}

export function getRevertErrorData(err: unknown) {
  if (!(err instanceof BaseError)) return undefined
  const error = err.walk() as RawContractError
  return error?.data as { errorName: string; args: unknown[] }
}

export type CcipRequestParameters = {
  body: { data: Hex; signature: TypedSignature; sender: Address }
  url: string
}

export async function ccipRequest({
  body,
  url,
}: CcipRequestParameters): Promise<Response> {
  return await fetch(url.replace('/{sender}/{data}.json', ''), {
    body: JSON.stringify(body, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
