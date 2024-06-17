import * as ccip from '@blockful/ccip-server'

import {
  DomainProps,
  Response,
  SetContentHashProps,
  RegisterDomainProps,
  OwnershipValidator,
  TypedSignature,
  TransferDomainProps,
} from '../types'
import { formatTTL } from '../services'
import { Domain } from '../entities'

interface SignatureRecover {
  recoverMessageSigner(TypedSignature): Promise<`0x${string}`>
}

interface WriteRepository {
  register(params: RegisterDomainProps)
  getDomain(params: DomainProps): Promise<Domain | null>
  transfer(params: TransferDomainProps)
  setContentHash(params: SetContentHashProps)
}

export function withRegisterDomain(
  repo: WriteRepository,
  recover: SignatureRecover,
): ccip.HandlerDescription {
  return {
    type: 'register(bytes32 node, uint32 ttl)',
    func: async ({ node, ttl }, { signature }) => {
      try {
        const signer = await recover.recoverMessageSigner(
          signature as TypedSignature,
        )

        const existingDomain = await repo.getDomain({ node })
        if (existingDomain) {
          if (existingDomain.owner !== signer) {
            return { error: { message: 'Forbidden action', status: 401 } }
          }
          return { error: { message: 'Domain already exists', status: 400 } }
        }

        await repo.register({ node, ttl, owner: signer })
      } catch (err) {
        return {
          error: { message: 'Unable to register new domain', status: 400 },
        }
      }
    },
  }
}

export function withTransferDomain(
  repo: WriteRepository,
  validator: OwnershipValidator,
): ccip.HandlerDescription {
  return {
    type: 'transfer(bytes32 node, address owner)',
    func: async ({ node, owner }, { signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature: signature! as TypedSignature,
        })
        if (!isOwner) {
          return { error: { message: 'Unauthorized', status: 401 } }
        }
        await repo.transfer({ node, owner })
      } catch (err) {
        return {
          error: { message: 'Unable to transfer domain', status: 400 },
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
    type: 'setContenthash(bytes32 node, bytes calldata contenthash)',
    func: async ({ node, contenthash }, { signature }) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature: signature! as TypedSignature,
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
      if (content)
        return { data: [content.value], extraData: formatTTL(content.ttl) }
    },
  }
}
