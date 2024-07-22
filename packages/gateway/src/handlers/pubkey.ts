import * as ccip from '@blockful/ccip-server'

import {
  SetPubkeyProps,
  NodeProps,
  OwnershipValidator,
  TypedSignature,
  GetPubkeyResponse,
} from '../types'

interface WriteRepository {
  setPubkey(params: SetPubkeyProps)
}

export function withSetPubkey(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setPubkey(bytes32 node,bytes32 x, bytes32 y)',
    func: async (
      { node, x, y },
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

        await repo.setPubkey({
          node,
          x,
          y,
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
  getPubkey(params: NodeProps): Promise<GetPubkeyResponse | undefined>
}

export function withGetPubkey(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'pubkey(bytes32 node)',
    func: async ({ node }) => {
      const pubkey = await repo.getPubkey({ node })
      if (pubkey) {
        const { x, y } = pubkey.value
        return { data: [x, y], extraData: pubkey.ttl }
      }
    },
  }
}
