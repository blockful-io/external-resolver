import * as ccip from '@blockful/ccip-server'

import {
  DomainProps,
  Response,
  SetContentHashProps,
  RegisterDomainProps,
  OwnershipValidator,
} from '../types'

interface SignatureRecover {
  recoverMessageSigner(
    data: `0x${string}`,
    signature: `0x${string}`,
  ): Promise<`0x${string}`>
}

interface WriteRepository {
  register(params: RegisterDomainProps)
  setContentHash(params: SetContentHashProps)
}

export function withRegisterDomain(
  repo: WriteRepository,
  recover: SignatureRecover,
): ccip.HandlerDescription {
  return {
    type: 'register',
    func: async ({ node, ttl }, { data, signature }) => {
      try {
        const signer = await recover.recoverMessageSigner(
          data as `0x${string}`,
          signature!,
        )
        await repo.register({ node, ttl, owner: signer })
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
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'setContenthash',
    func: async ({ node, contenthash }, { data, signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          data: data as `0x${string}`,
          signature: signature!,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }

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
