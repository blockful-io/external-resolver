import * as ccip from '@blockful/ccip-server'

import { SetTextProps, GetTextProps, Response } from '../types'

interface WriteRepository {
  setText(params: SetTextProps): Promise<void>
}

export function withSetText(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setText',
    func: async ({ node, key, value }) => {
      try {
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
