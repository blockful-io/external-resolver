import { Hex, labelhash, namehash, zeroAddress } from 'viem'
import { normalize } from 'viem/ens'

import { Text, Address, DomainMetadata, NodeProps } from '../types'
import { Domain } from '../entities'

interface ReadRepository {
  getDomain(params: NodeProps): Promise<Domain | null>
  getSubdomains({ node }: NodeProps): Promise<string[]>
  getTexts({ node }: NodeProps): Promise<Text[]>
  getAddresses({ node }: NodeProps): Promise<Address[]>
}

interface Client {
  getExpireDate(node: Hex): Promise<string>
  getOwner(node: Hex): Promise<Hex>
  getResolver(node: Hex): Promise<Hex | undefined>
}

export async function domainResolver(
  { name }: { name: string },
  repo: ReadRepository,
  client: Client,
): Promise<DomainMetadata | undefined> {
  name = normalize(name)
  const node = namehash(name)
  const domain = await repo.getDomain({ node })
  const resolver = domain?.resolver || (await client.getResolver(node))
  if (!resolver || resolver === zeroAddress) return

  // gather the first part of the domain (e.g. lucas.blockful.eth -> lucas)
  const [, label] = /^(\w+)/.exec(name) || []
  // gather the last part of the domain (e.g. lucas.blockful.eth -> blockful.eth)
  const [, parent] = /\w*\.(.*)$/.exec(name) || []

  const subdomains = await repo.getSubdomains({ node })
  const texts = await repo.getTexts({ node })
  const addresses = await repo.getAddresses({ node })
  const addr = addresses.find((addr) => addr.coin === '60') // ETH
  const context = domain?.owner || (await client.getOwner(node))
  const expiryDate = await client.getExpireDate(node)

  return {
    id: `${context}-${node}`,
    context,
    name,
    namehash: node,
    labelName: label,
    labelhash: labelhash(label),
    resolvedAddress: resolver,
    parent: namehash(parent),
    subdomains,
    subdomainCount: subdomains.length,
    expiryDate,
    resolver: {
      id: `${context}-${node}`,
      node,
      context,
      address: resolver,
      addr: addr?.address,
      contentHash: domain?.contenthash,
      texts,
      addresses,
    },
  }
}
