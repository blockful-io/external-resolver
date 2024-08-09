import { Hex, labelhash, namehash } from 'viem'
import { normalize } from 'viem/ens'

import { Text, Address, DomainMetadata, NodeProps, Response } from '../types'
import { Domain } from '../entities'

interface ReadRepository {
  getDomain(params: NodeProps): Promise<Domain | null>
  getSubdomains({ node }: NodeProps): Promise<string[]>
  getTexts({ node }: NodeProps): Promise<Text[]>
  getAddresses({ node }: NodeProps): Promise<Address[]>
  getContentHash({ node }: NodeProps): Promise<Response | undefined>
}

interface Client {
  getExpireDate(label: Hex): Promise<string>
  getOwner(node: Hex): Promise<Hex>
  getResolver(node: Hex): Promise<Hex | undefined>
}

export async function domainResolver(
  { name }: { name: string },
  repo: ReadRepository,
  client: Client,
  resolverAddress: Hex,
): Promise<DomainMetadata | undefined> {
  name = normalize(name)
  const node = namehash(name)
  const domain = await repo.getDomain({ node })
  const resolver = domain?.resolver || (await client.getResolver(node))
  if (resolver !== resolverAddress) return

  // gather the first part of the domain (e.g. lucas.blockful.eth -> lucas)
  const [, label] = /^(\w+)/.exec(name) || []
  // gather the last part of the domain (e.g. lucas.blockful.eth -> blockful.eth)
  const [, parent] = /\w*\.(.*)$/.exec(name) || []

  const subdomains = await repo.getSubdomains({ node })
  const texts = await repo.getTexts({ node })
  const addresses = await repo.getAddresses({ node })
  const addr = addresses.find((addr) => addr.coin === '60') // ETH
  const owner = domain?.owner || (await client.getOwner(node))
  const expiryDate = await client.getExpireDate(labelhash(label))
  const contentHash = await repo.getContentHash({ node })

  return {
    id: `${owner}-${node}`,
    context: owner,
    name,
    namehash: node,
    owner,
    label,
    labelhash: labelhash(label),
    resolvedAddress: resolver,
    parent,
    parentHash: namehash(parent),
    subdomains,
    subdomainCount: subdomains.length,
    expiryDate,
    resolver: {
      id: `${owner}-${node}`,
      node,
      context: owner,
      address: resolver,
      addr: addr?.address,
      contentHash: contentHash?.value as `0x${string}`,
      texts,
      addresses,
    },
  }
}
