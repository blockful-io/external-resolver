import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'

import { DomainProps, Response, SetContentHashProps } from '../types'

interface WriteRepository {
  setContentHash(params: SetContentHashProps): Promise<Response | undefined>
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
      const addr = await repo.setContentHash(params)
      if (!addr) return []

      return [addr.value, addr.ttl]
    },
  }
}

interface ReadRepository {
  contentHash(params: DomainProps): Promise<Response | undefined>
}

export function withContentHash(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'contenthash',
    func: async (args: ethers.utils.Result) => {
      const params: DomainProps = {
        node: args.node,
      }
      const addr = await repo.contentHash(params)
      if (!addr) return []

      return [addr.value, addr.ttl]
    },
  }
}
