import * as ccip from '@blockful/ccip-server'
import { ccipRequest } from 'viem/utils'
import { Address } from 'viem'

export function withWrite(): ccip.HandlerDescription {
  return {
    type: 'write',
    func: async ({ data }, req: ccip.RPCCall) => {
      try {
        await ccipRequest({
          data,
          sender: req.to as Address,
          urls: ['http://127.0.0.1:3000/{sender}/{data}.json'],
        })
      } catch (error) {
        console.error({ error })
        // return { error: { message: error.message } }
      }
    },
  }
}
