import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { SetTextProps, GetTextProps, Signer } from '../types'

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
  getText(params: GetTextProps): Promise<string | undefined>
}

export function withGetText(
  signer: Signer,
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'text',
    func: async (args: ethers.utils.Result) => {
      const params: GetTextProps = {
        node: args.node!,
        key: args.key!,
      }
      const text = await repo.getText(params)
      if (!text) return []
      const signature = await signer.sign(text)
      return [text, 0, signature]
    },
  }
}
