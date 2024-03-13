import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { GetAddressProps, Response, SetAddressProps } from '../types'

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
      if (!params.coin) params.coin = 60 // default: ether
      await repo.setAddr(params)
      return []
    },
  }
}

interface ReadRepository {
  addr(params: GetAddressProps): Promise<Response | undefined>
}

export function withGetAddr(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'addr',
    func: async (args: ethers.utils.Result) => {
      const params: GetAddressProps = {
        node: args.node,
        coin: args.coin,
      }
      if (!params.coin) params.coin = 60 // default: ether
      const addr = await repo.addr(params)
      if (!addr) return []
      return [addr.value]
    },
  }
}
