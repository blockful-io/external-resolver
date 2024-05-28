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
  PrivateKeyAccount,
  walletActions,
  Abi,
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
  .requiredOption('-r --resolver <address>', 'ENS Universal Resolver address')
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545/')
  .option('-i --chainId <chainId>', 'chainId', '31337')
  .option(
    '-pk --privateKey <privateKey>',
    'privateKey',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil PK
  )

program.parse(process.argv)

const { resolver, provider, chainId, privateKey } = program.opts()

function getChain(chainId: number) {
  return Object.values(chains).find((chain) => chain.id === chainId)
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
  const signer = privateKeyToAccount(privateKey)

  const [resolverAddr] = (await client.readContract({
    address: resolver,
    functionName: 'findResolver',
    abi: uABI,
    args: [toHex(packetToBytes(publicAddress))],
  })) as Hash[]

  // REGISTER NEW DOMAIN
  const registerArgs = {
    functionName: 'register',
    abi: dbABI,
    args: [namehash(publicAddress), 9999999999n],
  }
  try {
    await client.simulateContract({ ...registerArgs, address: resolverAddr })
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

        try {
          handleL2Storage({
            chainId,
            args: {
              ...registerArgs,
              address: contractAddress,
              account: signer.address,
            },
          })
        } catch (err) {
          console.log({ err })
        }
        break
      }
      default:
        console.error({ err })
    }
  }

  // SET TEXT

  const setTextArgs = {
    functionName: 'setText',
    abi: dbABI,
    args: [namehash(publicAddress), 'com.twitter', '@xxx_blockful.eth'],
  }
  try {
    await client.simulateContract({ ...setTextArgs, address: resolverAddr })
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

        try {
          handleL2Storage({
            chainId,
            args: {
              ...setTextArgs,
              address: contractAddress,
              account: signer.address,
            },
          })
        } catch (err) {
          console.log({ err })
        }
        break
      }
      default:
        console.error({ err })
    }
  }
})()

async function handleL2Storage({
  chainId,
  args,
}: {
  chainId: bigint
  args: {
    abi: Abi | unknown[]
    address: Address
    account: Hash
    functionName: string
    args: unknown[]
  }
}) {
  const chain = getChain(Number(chainId))

  const l2Client = createPublicClient({
    chain,
    transport: http('http://127.0.0.1:8545'),
  }).extend(walletActions)

  const { request } = await l2Client.simulateContract(args)
  await l2Client.writeContract(request)
}

async function handleDBStorage({
  domain,
  url,
  message,
  signer,
}: {
  domain: DomainData
  url: string
  message: MessageData
  signer: PrivateKeyAccount
}) {
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

export async function ccipRequest({ body, url }: CcipRequestParameters) {
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
