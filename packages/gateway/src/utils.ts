import { defineChain } from 'viem'
import * as chains from 'viem/chains'

export function getChain(chainId: number): chains.Chain | undefined {
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

// gather the first part of the domain (e.g. floripa.blockful.eth -> floripa)
export const extractLabelFromName = (name: string): string => {
  const [, label] = /^(\w+)/.exec(name) || []
  return label
}

// gather the last part of the domain (e.g. floripa.blockful.eth -> blockful.eth)
export const extractParentFromName = (name: string): string => {
  const [, parent] = /\w*\.(.*)$/.exec(name) || []
  return parent
}

export function decodeDNSName(hexString: string): string {
  // Remove '0x' prefix if present
  hexString = hexString.replace(/^0x/, '')

  // Convert hex string to byte array
  const bytes = new Uint8Array(
    hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  )

  if (bytes.length === 0) {
    throw new Error('Invalid hex string: empty or malformed')
  }

  const result: string[] = []
  let index = 0

  while (index < bytes.length) {
    const labelLength = bytes[index]
    if (!labelLength) break // End of domain name

    index++
    const endIndex = index + labelLength

    if (endIndex > bytes.length) {
      throw new Error(
        'Invalid DNS encoding: label length exceeds remaining bytes',
      )
    }

    const label = new TextDecoder().decode(bytes.subarray(index, endIndex))
    result.push(label)
    index = endIndex
  }

  if (result.length === 0) {
    throw new Error('Invalid DNS encoding: no labels found')
  }

  return result.join('.')
}
