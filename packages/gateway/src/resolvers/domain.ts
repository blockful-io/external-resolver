import { namehash } from 'viem'

import { Domain } from '../entities'
import {
  Address,
  DomainMetadata,
  DomainProps,
  GetAddressProps,
  Response,
  Text,
} from '../types'

interface ReadRepository {
  getDomain(params: DomainProps): Promise<Domain | null>
  getSubdomains({ node }: Pick<Domain, 'node'>): Promise<Domain[]>
  getTexts({ node }: Pick<Domain, 'node'>): Promise<Text[]>
  getAddresses({ node }: Pick<Domain, 'node'>): Promise<Address[]>
  getAddr(params: GetAddressProps): Promise<Response | undefined>
}

export async function domainResolver(
  { name }: { name: string },
  repo: ReadRepository,
): Promise<DomainMetadata | undefined> {
  const node = namehash(name)
  const domain = await repo.getDomain({ node })
  if (!domain) return

  const parent =
    (await repo.getDomain({ node: domain.parent })) || domain.parent
  const subdomains = await repo.getSubdomains({ node })

  const subMetadatas = await Promise.all(
    subdomains.map((s) => domainResolver({ name: s.name }, repo)),
  )
  const texts = await repo.getTexts({ node })
  const addresses = await repo.getAddresses({ node })
  const addr = addresses.find((addr) => addr.coin === '60') // ETH

  const context = domain.owner

  return {
    id: `${context}-${node}`,
    context,
    name: domain.name,
    namehash: domain.node,
    labelName: domain.label,
    labelhash: domain.labelhash,
    resolvedAddress: domain.resolver,
    parent,
    subdomains: subMetadatas.map((s) => s!.name),
    subdomainCount: subdomains.length,
    expiryDate: 0n, // offchain domains don't have expire date
    resolver: {
      id: `${context}-${domain.node}`,
      node: domain.node,
      context: domain.owner,
      address: domain.resolver,
      domain,
      addr: addr?.address,
      contentHash: domain.contenthash,
      texts,
      addresses,
    },
  }
}
