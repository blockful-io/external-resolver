// @ts-expect-error askfmaklmf
import * as ccip from '@chainlink/ccip-read-server'
import { ccipRequest } from 'viem/utils'
import { Hex } from 'viem'

export function withQuery(): ccip.HandlerDescription {
  return {
    type: 'query',
    func: async (args) => {
      const failures: boolean[] = []
      const responses: Hex[] = []
      for (const [sender, urls, callData] of args.data) {
        try {
          const result = await ccipRequest({ data: callData, sender, urls })
          responses.push(result)
          failures.push(false)
        } catch (err) {
          responses.push('0x0')
          failures.push(true)
        }
      }
      return [failures, responses]
    },
  }
}
