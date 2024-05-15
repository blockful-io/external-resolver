import * as ccip from '@blockful/ccip-server'

import { SetTextProps, GetTextProps, Response } from '../types'
import { Hex, recoverMessageAddress } from 'viem'

interface WriteRepository {
  setText(params: SetTextProps)
  verifyOwnership(node: Hex, address: `0x${string}`): Promise<boolean>
}

export function withSetText(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setText',
    func: async ({ node, key, value }, { data, signature }) => {
      try {
        const address = await recoverMessageAddress({
          message: { raw: data as Hex },
          signature: signature as Hex,
        })

        const isOwner = await repo.verifyOwnership(node, address)
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
