import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { DomainProps, Response, SetContentHashProps } from '../types'

interface WriteRepository {
  setContentHash(params: SetContentHashProps): Promise<void>
}

export function withSetContentHash(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash',
    func: async (args: ethers.utils.Result) => {
      const params: SetContentHashProps = {
        node: args.node,
        contenthash: args.contenthash,
      }
      await repo.setContentHash(params)
      return []
    },
  }
}

interface ReadRepository {
  contentHash(params: DomainProps): Promise<Response | undefined>
}

export function withGetContentHash(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'contenthash',
    func: async (args: ethers.utils.Result) => {
      const params: DomainProps = {
        node: args.node,
      }
      const addr = await repo.contentHash(params)
      if (!addr) return []
      return [addr.value]
    },
  }
}
