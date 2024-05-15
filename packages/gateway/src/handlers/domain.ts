import * as ccip from '@blockful/ccip-server'

import {
  DomainProps,
  Response,
  SetContentHashProps,
  RegisterDomainProps,
} from '../types'
import { recoverMessageAddress, Hex } from 'viem'

interface WriteRepository {
  register(params: RegisterDomainProps)
  setContentHash(params: SetContentHashProps)
}

export function withRegisterDomain(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'register',
    func: async ({ node, ttl }, { data, signature }) => {
      try {
        const address = await recoverMessageAddress({
          message: { raw: data as Hex },
          signature: signature as Hex,
        })

        await repo.register({ node, ttl, address })
      } catch (err) {
        return {
          error: { message: 'Unable to register new domain', status: 400 },
        }
      }
    },
  }
}

export function withSetContentHash(
  repo: WriteRepository,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash',
    func: async ({ node, contenthash }) => {
      try {
        await repo.setContentHash({ node, contenthash })
      } catch (err) {
        return {
          error: { message: 'Unable to save contenthash', status: 400 },
        }
      }
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
    func: async ({ node }) => {
      const content = await repo.getContentHash({ node })
      if (content) return { data: [content.value], extraData: content.ttl }
    },
  }
}
