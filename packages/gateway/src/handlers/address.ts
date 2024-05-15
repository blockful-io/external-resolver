import * as ccip from '@blockful/ccip-server'

import { GetAddressProps, Response, SetAddressProps } from '../types'
import { Hex, recoverMessageAddress } from 'viem'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
  verifyOwnership(node: Hex, address: `0x${string}`): Promise<boolean>
}

export function withSetAddr(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setAddr',
    func: async ({ node, coin = 60, addr }, { data, signature }) => {
      try {
        const address = await recoverMessageAddress({
          message: { raw: data as Hex },
          signature: signature as Hex,
        })
        const isOwner = await repo.verifyOwnership(node, address)
        if (!isOwner) {
          return { error: { message: 'Authentication failed', status: 400 } }
        }

        await repo.setAddr({ node, coin, addr })
      } catch (err) {
        return { error: { message: 'Unable to save address', status: 400 } }
      }
    },
  }
}

interface ReadRepository {
  getAddr(params: GetAddressProps): Promise<Response | undefined>
}

export function withGetAddr(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'addr',
    func: async ({ node, coin = 60 }) => {
      // default: ether
      const addr = await repo.getAddr({ node, coin })
      if (!addr) return
      return { data: [addr.value], extraData: addr.ttl }
    },
  }
}
