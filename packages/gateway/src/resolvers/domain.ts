import { Hex, labelhash, namehash } from 'viem'
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
  getExpireDate(label: Hex): Promise<bigint>
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

  return {
    id: `${owner}-${node}`,
    context: owner,
    name,
    node,
    owner,
    label,
    labelhash: labelhash(label),
    resolvedAddress: resolver,
    parent,
    parentNode: namehash(parent),
    subdomains,
    subdomainCount: subdomains.length,
    expiryDate,
    registerDate: domain?.createdAt && BigInt(domain?.createdAt.getTime()),
    resolver: {
      id: `${owner}-${node}`,
      node,
      context: owner,
      address: resolver,
      addr: addr?.address,
      contentHash: domain?.contenthash,
      texts,
      addresses,
    },
  }
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
