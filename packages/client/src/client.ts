import {
  BaseError,
  RawContractError,
  Hex,
  Address,
  PrivateKeyAccount,
  defineChain,
} from 'viem'
import * as chains from 'viem/chains'

import {
  DomainData,
  MessageData,
  TypedSignature,
} from '@blockful/gateway/src/types'

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
        { name: 'callData', type: 'bytes' },
        { name: 'sender', type: 'address' },
        { name: 'expirationTimestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Message',
  })
  return await ccipRequest({
    body: {
      data: message.callData,
      signature: { message, domain, signature },
      sender: message.sender,
    },
    url,
  })
}

export function getChain(chainId: number) {
  return [
    ...Object.values(chains),
    defineChain({
      id: Number(chainId),
      name: 'Arbitrum Local',
      nativeCurrency: {
        name: 'Arbitrum Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['http://127.0.0.1:8547'],
        },
      },
    }),
  ].find((chain) => chain.id === chainId)
}
