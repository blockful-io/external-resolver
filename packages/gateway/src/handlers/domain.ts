import * as ccip from '@blockful/ccip-server'

import {
  DomainProps,
  Response,
  SetContentHashProps,
  RegisterDomainProps,
} from '../types'

interface WriteRepository {
  register({ node }: RegisterDomainProps): Promise<void | Error>
  setContentHash(params: SetContentHashProps)
}

export function withRegisterDomain(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'register',
    func: async ({ node, ttl, signature }: RegisterDomainProps) => {
      const error = await repo.register({ node, ttl, signature })
      return { data: [], error }
    },
  }
}

export function withSetContentHash(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash',
    func: async ({ node, contenthash }) => {
      await repo.setContentHash({ node, contenthash })
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
    func: async ({ node }): Promise<ccip.HandlerResponse> => {
      const content = await repo.getContentHash({ node })
      if (!content) return { data: [] }
      return { data: [content.value], extraData: content.ttl }
    },
  }
}
