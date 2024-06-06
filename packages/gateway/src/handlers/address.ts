import * as ccip from '@blockful/ccip-server'

import {
  GetAddressProps,
  Response,
  SetAddressProps,
  OwnershipValidator,
  TypedSignature,
} from '../types'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
}

export function withSetAddr(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'function setAddr(bytes32 node, address addr)',
    func: async ({ node, addr }, { signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature: signature! as TypedSignature,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }
        await repo.setAddr({ node, addr, coin: 60 }) // default ether
      } catch (err) {
        return { error: { message: 'Unable to save address', status: 400 } }
      }
    },
  }
}

export function withSetAddrByCoin(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'function setAddr(bytes32 node, uint coinType, bytes calldata addr)',
    func: async ({ node, coin, addr }, { signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature: signature! as TypedSignature,
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
    type: 'function addr(bytes32 node)',
    func: async ({ node, coin = 60 }) => {
      const addr = await repo.getAddr({ node, coin })
      if (addr) return { data: [addr.value], extraData: addr.ttl }
    },
  }
}

export function withGetAddrByCoin(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'function addr(bytes32 node, uint coinType)',
    func: async ({ node, coin }) => {
      const addr = await repo.getAddr({ node, coin })
      if (addr) return { data: [addr.value], extraData: addr.ttl }
    },
  }
}
