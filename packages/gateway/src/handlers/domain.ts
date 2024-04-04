import * as ccip from '@blockful/ccip-server'

import { DomainProps, SetContentHashProps } from '../types'

interface WriteRepository {
  setContentHash(params: SetContentHashProps): Promise<void>
}

export function withSetContentHash(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash',
    func: async (args) => {
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
  contentHash(params: DomainProps): Promise<`0x${string}` | undefined>
}

export function withGetContentHash(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'contenthash',
    func: async (args) => {
      const params: DomainProps = {
        node: args.node,
      }
      const content = await repo.contentHash(params)
      if (!content) return []
      return [content]
    },
  }
}
