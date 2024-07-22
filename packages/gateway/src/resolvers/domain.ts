import { namehash } from 'viem'

import { Domain } from '../entities'
import {
  DomainMetadata,
  DomainProps,
  GetAddressProps,
  Response,
} from '../types'

interface ReadRepository {
  getDomain(params: DomainProps): Promise<Domain | null>
  getSubdomains({ node }: Pick<Domain, 'node'>): Promise<Domain[]>
  getTextKeys({ node }: Pick<Domain, 'node'>): Promise<string[]>
  getAddressCoins({ node }: Pick<Domain, 'node'>): Promise<string[]>
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

  const xs = await Promise.all(
    subdomains.map((s) => domainResolver({ name: s.name }, repo)),
  )
  const texts = await repo.getTextKeys({ node })
  const coinTypes = await repo.getAddressCoins({ node })
  const addr = await repo.getAddr({ node, coin: '60' }) // ETH

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
    subdomains: xs.reduce<DomainMetadata[]>((x, y) => (y ? [...x, y] : x), []),
    subdomainCount: xs.length,
    resolver: {
      id: `${context}-${domain.node}`,
      node: domain.node,
      context: domain.owner,
      address: domain.resolver,
      domain,
      addr: addr?.value,
      contentHash: domain.contenthash,
      texts,
      coinTypes: coinTypes,
    },
  }
}
