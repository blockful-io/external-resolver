import * as ccip from '@blockful/ccip-server'

import { DomainProps, Response, SetContentHashProps } from '../types'

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
      return { data: [] }
    },
  }
}

interface ReadRepository {
  getContentHash(params: DomainProps): Promise<Response | undefined>
}

export function withGetContentHash(
  repo: ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'contenthash',
    func: async (args): Promise<ccip.HandlerResponse> => {
      const params: DomainProps = {
        node: args.node,
      }
      const content = await repo.getContentHash(params)
      if (!content) return { data: [] }
      return { data: [content.value], extraData: content.ttl }
    },
  }
}
