import { hexToString, toHex } from 'viem'
import * as ccip from '@blockful/ccip-server'

import {
  NodeProps,
  Response,
  SetContentHashProps,
  OwnershipValidator,
  TypedSignature,
} from '../types'
import { formatTTL } from '../services'

interface WriteRepository {
  setContentHash(params: SetContentHashProps)
}

interface ReadRepository {
  getContentHash(params: NodeProps): Promise<Response | undefined>
}

export function withSetContentHash(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash(bytes32 node, bytes calldata contenthash)',
    func: async (
      { node, contenthash },
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

        await repo.setContentHash({
          node,
          contenthash: hexToString(contenthash),
          resolver: signature.domain.verifyingContract,
          resolverVersion: signature.domain.version,
        })
      } catch (err) {
        return {
          error: { message: 'Unable to save contenthash', status: 400 },
        }
      }
    },
  }
}

export function withGetContentHash(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'contenthash(bytes32 node)',
    func: async ({ node }) => {
      const content = await repo.getContentHash({ node })
      if (content)
        return {
          data: [toHex(content.value)],
          extraData: formatTTL(content.ttl),
        }
    },
  }
}
