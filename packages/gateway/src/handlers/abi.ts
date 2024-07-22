import * as ccip from '@blockful/ccip-server'

import {
  SetAbiProps,
  Response,
  OwnershipValidator,
  TypedSignature,
  NodeProps,
} from '../types'

interface WriteRepository {
  setAbi(params: SetAbiProps)
}

export function withSetAbi(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setABI(bytes32 node, uint256 contentType, bytes calldata data)',
    func: async (
      { node, data /*, contentType */ },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }

        await repo.setAbi({
          node,
          value: data,
          resolver: signature.message.sender,
          resolverVersion: signature.domain.version,
        })
      } catch (err) {
        return { error: { message: 'Unable to save abi', status: 400 } }
      }
    },
  }
}

interface ReadRepository {
  getABI(params: NodeProps): Promise<Response | undefined>
}

export function withGetAbi(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'ABI(bytes32 node, uint256 contentType)',
    func: async ({ node /*, contentType */ }) => {
      const abi = await repo.getABI({ node })
      if (abi) return { data: [0, abi.value], extraData: abi.ttl }
    },
  }
}
