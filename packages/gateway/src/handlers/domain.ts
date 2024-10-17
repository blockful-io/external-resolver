import { hexToString, namehash } from 'viem'

import * as ccip from '@blockful/ccip-server'

import {
  NodeProps,
  RegisterDomainProps,
  OwnershipValidator,
  TypedSignature,
  TransferDomainProps,
} from '../types'
import {
  parseEncodedAddressCalls,
  parseEncodedContentHashCall,
  parseEncodedTextCalls,
} from '../services'
import { Domain } from '../entities'

interface WriteRepository {
  register(params: RegisterDomainProps)
  transfer(params: TransferDomainProps)
}

interface ReadRepository {
  getDomain(params: NodeProps): Promise<Domain | null>
}

export function withRegisterDomain(
  repo: WriteRepository & ReadRepository,
): ccip.HandlerDescription {
  return {
    type: 'register(bytes memory name, uint32 ttl, address owner, bytes[] calldata data)',
    func: async (
      { name, ttl, owner, data },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        name = hexToString(name)
        const node = namehash(name)

        const existingDomain = await repo.getDomain({ node })
        if (existingDomain) {
          return { error: { message: 'Domain already exists', status: 400 } }
        }

        const [, parent] = /\w*\.(.*)$/.exec(name) || []
        const parentHash = namehash(parent)

        const addresses = parseEncodedAddressCalls(data, signature)
        const texts = parseEncodedTextCalls(data, signature)
        const contenthash = parseEncodedContentHashCall(data, signature)

        await repo.register({
          name,
          node,
          ttl,
          owner,
          contenthash,
          parent: parentHash,
          resolver: signature.domain.verifyingContract,
          resolverVersion: signature.domain.version,
          addresses,
          texts,
        })
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
    func: async (
      { node, owner },
      { signature }: { signature: TypedSignature },
    ) => {
      try {
        const isOwner = await validator.verifyOwnership({
          node,
          signature,
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
