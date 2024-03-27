import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { Response, SetTextProps, GetTextProps } from '../types'

interface WriteRepository {
  setText(params: SetTextProps): Promise<void>
}

export function withSetText(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setText',
    func: async (args: ethers.utils.Result) => {
      const params: SetTextProps = {
        node: args.node!,
        key: args.key!,
        value: args.value!,
      }

      await repo.setText(params)
      return []
    },
  }
}

interface ReadRepository {
  getText(params: GetTextProps): Promise<Response | undefined>
}

export function withGetText(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'text',
    func: async (args: ethers.utils.Result) => {
      const params: GetTextProps = {
        node: args.node!,
        key: args.key!,
      }
      const text = await repo.getText(params)
      if (!text) return []
      return [text.value]
    },
  }
}
