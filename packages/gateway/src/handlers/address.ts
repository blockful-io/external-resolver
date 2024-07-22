import * as ccip from '@blockful/ccip-server'

import {
  GetAddressProps,
  Response,
  SetAddressProps,
  OwnershipValidator,
  TypedSignature,
} from '../types'
import { formatTTL } from '../services'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
}

export function withSetAddr(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setAddr(bytes32 node, address addr)',
    func: async (
      { node, addr },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }
        await repo.setAddr({
          node,
          addr,
          coin: '60', // default ether
          resolver: signature.domain.verifyingContract,
          resolverVersion: signature.domain.version,
        })
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
    type: 'setAddr(bytes32 node, uint256 coinType, bytes memory addr)',
    func: async (
      { node, coinType: coin, addr },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature: signature! as TypedSignature,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }
        await repo.setAddr({
          node,
          coin: coin.toString(),
          addr,
          resolver: signature.domain.verifyingContract,
          resolverVersion: signature.domain.version,
        })
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
    type: 'addr(bytes32 node)',
    func: async ({ node, coin = '60' }) => {
      const addr = await repo.getAddr({ node, coin: coin.toString() })
      if (addr)
        return {
          data: [addr.value],
          extraData: formatTTL(addr.ttl),
        }
    },
  }
}

export function withGetAddrByCoin(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'addr(bytes32 node, uint256 coinType)',
    func: async ({ node, coinType: coin }) => {
      const addr = await repo.getAddr({ node, coin: coin.toString() })
      if (addr) return { data: [addr.value], extraData: formatTTL(addr.ttl) }
    },
  }
}
