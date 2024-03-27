import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { GetAddressProps, SetAddressProps, Signer } from '../types'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
}

export function withSetAddr(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setAddr',
    func: async (args: ethers.utils.Result) => {
      const params: SetAddressProps = {
        node: args.node,
        coin: args.coin,
        addr: args.addr,
      }
      if (params.coin === undefined) params.coin = 60 // default: ether
      await repo.setAddr(params)
      return []
    },
  }
}

interface ReadRepository {
  addr(params: GetAddressProps): Promise<string | undefined>
}

export function withGetAddr(
  signer: Signer,
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'addr',
    func: async (args: ethers.utils.Result) => {
      const params: GetAddressProps = {
        node: args.node,
        coin: args.coin,
      }
      if (params.coin === undefined) params.coin = 60 // default: ether
      const addr = await repo.addr(params)
      if (!addr) return []
      const signature = await signer.sign(addr)
      return [addr, 0, signature]
    },
  }
}
