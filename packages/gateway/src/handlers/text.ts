import * as ccip from '@blockful/ccip-server'

import {
  SetTextProps,
  GetTextProps,
  Response,
  OwnershipValidator,
  TypedSignature,
} from '../types'
import { formatTTL } from '../services'

interface WriteRepository {
  setText(params: SetTextProps)
}

export function withSetText(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setText(bytes32 node, string calldata key, string calldata value)',
    func: async (
      { node, key, value },
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
        // Disable setting reserved keys since we're using the same table
        if (key === 'pubkey' || key === 'ABI') {
          return { error: { message: 'Reserved key', status: 400 } }
        }

        await repo.setText({
          node,
          key,
          value,
          resolver: signature.message.sender,
          resolverVersion: signature.domain.version,
        })
      } catch (err) {
        return { error: { message: 'Unable to save text', status: 400 } }
      }
    },
  }
}

interface ReadRepository {
  getText(params: GetTextProps): Promise<Response | undefined>
}

export function withGetText(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'text(bytes32 node, string key) view returns (string)',
    func: async ({ node, key }) => {
      const text = await repo.getText({ node, key })
      if (text) return { data: [text.value], extraData: formatTTL(text.ttl) }
    },
  }
}
