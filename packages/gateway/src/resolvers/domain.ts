import { Hex, labelhash, namehash } from 'viem'

import { Text, Address, DomainMetadata, NodeProps } from '../types'
import { Domain } from '../entities'

interface ReadRepository {
  getDomain(params: NodeProps): Promise<Domain | null>
  getSubdomains({ node }: NodeProps): Promise<string[]>
  getTexts({ node }: NodeProps): Promise<Text[]>
  getAddresses({ node }: NodeProps): Promise<Address[]>
}

interface Client {
  getOwner(node: Hex): Promise<Hex>
  getResolver(node: Hex): Promise<Hex | undefined>
}

export async function domainResolver(
  { name }: { name: string },
  repo: ReadRepository,
  client: Client,
): Promise<DomainMetadata | undefined> {
  const node = namehash(name)
  const domain = await repo.getDomain({ node })
  const resolver = domain?.resolver || (await client.getResolver(node))
  if (!resolver) return

  const [, labelName] = /(.*)\.eth/.exec(name) || []
  const lhash = labelhash(labelName)
  const [, parentName] = /\w*\.(.*)$/.exec(name) || []
  const parent = namehash(parentName)

  const subdomains = await repo.getSubdomains({ node })
  const texts = await repo.getTexts({ node })
  const addresses = await repo.getAddresses({ node })
  const addr = addresses.find((addr) => addr.coin === '60') // ETH
  const context = domain?.owner || (await client.getOwner(node))

  return {
    id: `${context}-${node}`,
    context,
    name,
    namehash: node,
    labelName,
    labelhash: lhash,
    resolvedAddress: resolver,
    parent,
    subdomains,
    subdomainCount: subdomains.length,
    expiryDate: 0n, // offchain domains don't have expire date
    resolver: {
      id: `${context}-$node}`,
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
