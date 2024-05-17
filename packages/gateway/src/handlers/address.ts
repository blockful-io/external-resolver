import * as ccip from '@blockful/ccip-server'

import {
  GetAddressProps,
  Response,
  SetAddressProps,
  OwnershipValidator,
} from '../types'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
}

export function withSetAddr(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setAddr',
    func: async ({ node, coin = 60, addr }, { data, signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          data: data as `0x${string}`,
          signature: signature!,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
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
