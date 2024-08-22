import { Hex, labelhash, namehash } from 'viem'
import { normalize } from 'viem/ens'

import { DomainMetadata, NodeProps, GetDomainProps } from '../types'
import { Address, Domain, Text } from '../entities'

interface ReadRepository {
  getDomain(params: GetDomainProps): Promise<Domain | null>
  getSubdomains({ node }: NodeProps): Promise<Domain[]>
  getTexts({ node }: NodeProps): Promise<Text[]>
  getAddresses({ node }: NodeProps): Promise<Address[]>
}

interface Client {
  getExpireDate(label: Hex): Promise<bigint>
  getOwner(node: Hex): Promise<Hex>
  getResolver(node: Hex): Promise<Hex | undefined>
}

interface DomainResolverProps {
  name: { name: string }
  repo: ReadRepository
  client: Client
  resolverAddress: Hex
}

export async function domainResolver({
  name: { name },
  repo,
  client,
  resolverAddress,
}: DomainResolverProps): Promise<DomainMetadata | undefined> {
  name = normalize(name)
  const node = namehash(name)
  const domain = await repo.getDomain({ node, includeRelations: true })
  const resolver = domain?.resolver || (await client.getResolver(node))
  if (resolver !== resolverAddress) return

  const label = extractLabelFromName(name)
  const parent = extractParentFromName(name)
  const expiryDate = await client.getExpireDate(labelhash(label))

  const subdomains = await repo.getSubdomains({ node })
  const subdomainsMetadata = subdomains.map((sd) => {
    const label = extractLabelFromName(sd.name)
    const parent = extractParentFromName(sd.name)
    return {
      id: `${sd.owner}-${sd.node}`,
      context: sd.owner,
      name: sd.name,
      node: sd.node,
      owner: sd.owner,
      label,
      labelhash: labelhash(label),
      resolverAddress: resolver,
      parent,
      parentNode: namehash(parent),
      expiryDate,
      registerDate: BigInt(sd.createdAt.getTime()),
      resolver: {
        id: `${sd.owner}-${sd.node}`,
        node: sd.node,
        context: sd.owner,
        address: sd.resolver,
        addr: sd.addresses.find((addr) => addr.coin === '60')?.address,
        contentHash: sd.contenthash,
        texts: sd.texts.map((t) => ({ key: t.key, value: t.value })),
        addresses: sd.addresses.map((addr) => ({
          address: addr.address,
          coin: addr.coin,
        })),
      },
    } as DomainMetadata
  })

  const texts = domain ? domain.texts : await repo.getTexts({ node })
  const addresses = domain
    ? domain.addresses
    : await repo.getAddresses({ node })

  const owner = domain?.owner || (await client.getOwner(node))
  return {
    id: `${owner}-${node}`,
    context: owner,
    name,
    node,
    owner,
    label,
    labelhash: labelhash(label),
    resolverAddress: resolver,
    parent,
    parentNode: namehash(parent),
    subdomains: subdomainsMetadata,
    subdomainCount: subdomains.length,
    expiryDate,
    registerDate: domain?.createdAt && BigInt(domain?.createdAt.getTime()),
    resolver: {
      id: `${owner}-${node}`,
      node,
      context: owner,
      address: resolver,
      addr: addresses.find((addr) => addr.coin === '60')?.address, // ETH
      contentHash: domain?.contenthash,
      texts: texts.map((t) => ({ key: t.key, value: t.value })),
      addresses: addresses.map((addr) => ({
        address: addr.address,
        coin: addr.coin,
      })),
    },
  }
}

// gather the first part of the domain (e.g. floripa.blockful.eth -> floripa)
const extractLabelFromName = (name: string): string => {
  const [, label] = /^(\w+)/.exec(name) || []
  return label
}

// gather the last part of the domain (e.g. floripa.blockful.eth -> blockful.eth)
const extractParentFromName = (name: string): string => {
  const [, parent] = /\w*\.(.*)$/.exec(name) || []
  return parent
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
