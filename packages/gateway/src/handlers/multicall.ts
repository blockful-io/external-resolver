import { decodeFunctionData, Hex, parseAbi } from 'viem'

import * as ccip from '@blockful/ccip-server'

import {
  TypedSignature,
  SetTextProps,
  SetAddressProps,
  SetContentHashProps,
} from '../types'
import { abi } from '../abi'

interface WriteRepository {
  setAddr(params: SetAddressProps)
  setText(params: SetTextProps)
  setContentHash(params: SetContentHashProps)
}

export function withMulticallWithNodeCheck(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'multicallWithNodeCheck(bytes32 node, bytes[] calldata data)',
    func: async (
      { node, data },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        for (const d of data) {
          const data = decodeFunctionData({ abi: parseAbi(abi), data: d })

          if (!data.args?.length) continue

          if (data.args[0] !== node) {
            return {
              error: {
                message: 'All records must have a matching namehash',
                status: 400,
              },
            }
          }

          switch (data.functionName) {
            case 'setAddr':
              if (data.args?.length === 2) {
                const [node, addr] = data.args as [Hex, string]
                await repo.setAddr({
                  node,
                  addr,
                  coin: '60',
                  resolver: signature.domain.verifyingContract,
                  resolverVersion: signature.domain.version,
                })
              } else if (data.args?.length === 3) {
                const [node, coin, addr] = data.args as [Hex, Hex, string]
                await repo.setAddr({
                  node,
                  addr,
                  coin: coin.toString(),
                  resolver: signature.domain.verifyingContract,
                  resolverVersion: signature.domain.version,
                })
              }
              break
            case 'setText': {
              const [node, key, value] = data.args as [Hex, string, string]
              await repo.setText({
                node,
                key,
                value,
                resolver: signature.domain.verifyingContract,
                resolverVersion: signature.domain.version,
              })
              break
            }
            case 'setContenthash': {
              const [node, contenthash] = data.args as [Hex, string]
              await repo.setContentHash({
                node,
                contenthash,
                resolver: signature.domain.verifyingContract,
                resolverVersion: signature.domain.version,
              })
              break
            }
          }
        }
      } catch (err) {
        return {
          error: { message: 'Unable to register new domain', status: 400 },
        }
      }
    },
  }
}
