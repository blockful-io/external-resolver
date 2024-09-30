import { ponder } from '@/generated'
import { config } from 'dotenv'
import { zeroAddress, zeroHash } from 'viem'
import { namehash } from 'viem/ens'

config({
  path: process.env.ENV_FILE || '../../../.env',
})

const registryAddress = process.env.REGISTRY_ADDRESS
if (!registryAddress) throw new Error('REGISTRY_ADDRESS is required')

ponder.on(
  'ETHRegistrarController:NameRegistered',
  async ({ event, context }) => {
    const { domain } = context.db

    const node = namehash(event.args.name)
    const name = decodeDNSHex(event.args.name)
    await domain.create({
      id: `${event.args.owner}-${node}`,
      data: {
        node,
        name,
        resolver: zeroAddress,
        parent: namehash(extractParentFromName(name)),
        owner: event.args.owner,
        ttl: event.args.expires.toString(),
        createdAt: new Date(
          parseInt(event.block.timestamp.toString()) * 1000,
        ).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  },
)

ponder.on('ENSRegistry:NewResolver', async ({ event, context }) => {
  const { domain } = context.db

  await domain.upsert({
    id: event.args.node,
    create: {
      owner: zeroAddress,
      node: event.args.node,
      name: '',
      parent: zeroHash,
      resolver: event.args.resolver,
      createdAt: new Date(
        parseInt(event.block.timestamp.toString()) * 1000,
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    update: {
      resolver: event.args.resolver,
      updatedAt: new Date().toISOString(),
    },
  })
})

ponder.on('ENSRegistry:NewTTL', async ({ event, context }) => {
  const { domain } = context.db

  await domain.update({
    id: event.args.node,
    data: {
      ttl: event.args.ttl.toString(),
      updatedAt: new Date().toISOString(),
    },
  })
})

ponder.on('ENSRegistry:NewOwner', async ({ event, context }) => {
  const { domain } = context.db

  if (event.args.node === zeroHash) return

  await domain.upsert({
    id: event.args.node,
    create: {
      owner: event.args.owner,
      node: event.args.node,
      name: '',
      parent: zeroHash,
      resolver: zeroAddress,
      createdAt: new Date(
        parseInt(event.block.timestamp.toString()) * 1000,
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    update: {
      owner: event.args.owner,
      updatedAt: new Date().toISOString(),
    },
  })
})

ponder.on('NameWrapper:NameWrapped', async ({ event, context }) => {
  const { domain } = context.db

  const name = decodeDNSHex(event.args.name)
  await domain.upsert({
    id: event.args.node,
    create: {
      owner: event.args.owner,
      node: event.args.node,
      name,
      parent: namehash(extractParentFromName(name)),
      resolver: zeroAddress,
      createdAt: new Date(
        parseInt(event.block.timestamp.toString()) * 1000,
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    update: {
      name,
      parent: namehash(extractParentFromName(name)),
      owner: event.args.owner,
      updatedAt: new Date().toISOString(),
    },
  })
})

ponder.on('PublicResolver:TextChanged', async ({ event, context }) => {
  const { text } = context.db
  await text.upsert({
    id: `${event.args.node}-${event.args.key}`,
    create: {
      domain: event.args.node,
      key: event.args.key,
      value: event.args.value,
      createdAt: new Date(
        parseInt(event.block.timestamp.toString()) * 1000,
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    update: {
      value: event.args.value,
      updatedAt: new Date().toISOString(),
    },
  })
})

ponder.on('PublicResolver:AddressChanged', async ({ event, context }) => {
  const { address } = context.db

  await address.upsert({
    id: `${event.args.node}-${event.args.coinType}`,
    create: {
      domain: event.args.node,
      address: event.args.newAddress,
      coin: event.args.coinType.toString(),
      createdAt: new Date(
        parseInt(event.block.timestamp.toString()) * 1000,
      ).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    update: {
      address: event.args.newAddress,
      updatedAt: new Date().toISOString(),
    },
  })
})

function decodeDNSHex(hexString: string): string {
  // Remove '0x' prefix if present
  hexString = hexString.replace(/^0x/, '')

  // Convert hex string to byte array
  const bytes = new Uint8Array(
    hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
  )

  if (bytes.length === 0) {
    throw new Error('Invalid hex string: empty or malformed')
  }

  const result: string[] = []
  let index = 0

  while (index < bytes.length) {
    const labelLength = bytes[index]
    if (!labelLength) break // End of domain name

    index++
    const endIndex = index + labelLength

    if (endIndex > bytes.length) {
      throw new Error(
        'Invalid DNS encoding: label length exceeds remaining bytes',
      )
    }

    const label = new TextDecoder().decode(bytes.subarray(index, endIndex))
    result.push(label)
    index = endIndex
  }

  if (result.length === 0) {
    throw new Error('Invalid DNS encoding: no labels found')
  }

  return result.join('.')
}

// gather the last part of the domain (e.g. floripa.blockful.eth -> blockful.eth)
const extractParentFromName = (name: string): string => {
  const [, parent] = /\w*\.(.*)$/.exec(name) || []
  return parent!
}
