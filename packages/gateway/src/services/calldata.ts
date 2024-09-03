import { Hex, decodeFunctionData, parseAbi } from 'viem'

import { abi } from '../abi'
import { TypedSignature } from '../types'
import { Text, Address } from '../entities'

export function parseEncodedTextCalls(data: Hex[], signature: TypedSignature) {
  const callData = data.map((d: Hex) =>
    decodeFunctionData({ abi: parseAbi(abi), data: d }),
  )

  return callData
    .filter((d) => d.functionName === 'setText')
    .map(({ args }): Omit<Text, 'id' | 'createdAt' | 'updatedAt'> => {
      const [domain, key, value] = args as [Hex, string, string]
      return {
        key,
        value,
        domain,
        resolver: signature.domain.verifyingContract,
        resolverVersion: signature.domain.version,
      }
    })
}

export function parseEncodedAddressCalls(
  data: Hex[],
  signature: TypedSignature,
) {
  const callData = data.map((d: Hex) =>
    decodeFunctionData({ abi: parseAbi(abi), data: d }),
  )

  return callData
    .filter((d) => d.functionName === 'setAddr')
    .map(({ args }): Omit<Address, 'id' | 'createdAt' | 'updatedAt'> => {
      if (args?.length !== 3) {
        const [domain, address] = args as [Hex, string]
        return {
          domain,
          address: address.toLowerCase(),
          coin: '60',
          resolver: signature.domain.verifyingContract,
          resolverVersion: signature.domain.version,
        }
      }
      const [domain, coin, address] = args as [Hex, string, string]
      return {
        domain,
        address,
        coin,
        resolver: signature.domain.verifyingContract,
        resolverVersion: signature.domain.version,
      }
    })
}
