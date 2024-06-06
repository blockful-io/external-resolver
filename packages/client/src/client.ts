import {
  BaseError,
  RawContractError,
  Hex,
  Address,
  Abi,
  Hash,
  createPublicClient,
  encodeFunctionData,
  PrivateKeyAccount,
  walletActions,
  http,
} from 'viem'
import * as chains from 'viem/chains'

import {
  DomainData,
  MessageData,
  TypedSignature,
} from '@blockful/gateway/src/types'
import { abi as dbABI } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'

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

export async function handleL2Storage({
  chainId,
  l2Url,
  args,
}: {
  chainId: bigint
  l2Url: string
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
    transport: http(l2Url),
  }).extend(walletActions)

  try {
    const { request } = await l2Client.simulateContract(args)
    await l2Client.writeContract(request)
  } catch (err) {
    console.log('error while trying to make the request: ', { err })
  }
}

export async function handleDBStorage({
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

export function getChain(chainId: number) {
  return Object.values(chains).find((chain) => chain.id === chainId)
}
