import * as ccip from '@blockful/ccip-server'

import {
  SetTextProps,
  GetTextProps,
  Response,
  OwnershipValidator,
} from '../types'

interface WriteRepository {
  setText(params: SetTextProps)
}

export function withSetText(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setText',
    func: async ({ node, key, value }, { data, signature }) => {
      try {
        const isOwner = validator.verifyOwnership({
          node,
          data: data as `0x${string}`,
          signature: signature!,
        })
        if (!isOwner) {
          return { error: { message: 'Authentication failed', status: 400 } }
        }

        await repo.setText({ node, key, value })
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
    type: 'text',
    func: async ({ node, key }) => {
      const text = await repo.getText({ node, key })
      if (text) return { data: [text.value], extraData: text.ttl }
    },
  }
}
