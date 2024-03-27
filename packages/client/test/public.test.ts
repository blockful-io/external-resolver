import { describe, expect, test } from 'vitest'
import { foundry } from 'viem/chains'
import { createTestClient, http, publicActions } from 'viem'
import { normalize } from 'viem/ens'

const client = createTestClient({
  chain: foundry,
  mode: 'anvil',
  transport: http(),
}).extend(publicActions)

describe('ENS reading', () => {
  const ensAddress = normalize('public.eth')

  test('should get avatar', async () => {
    const avatar = await client.getEnsAvatar({
      name: ensAddress,
      universalResolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    })

    expect(avatar).toContain('QmdzG4h3KZjcyLsDaVxuFGAjYi7MYN4xxGpU9hwSj1c3CQ') // blockful.jpeg
  })

  test('should get address', async () => {
    const address = await client.getEnsAddress({
      name: ensAddress,
      universalResolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    })

    expect(address).toMatch(/0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266/i) // case insensitive
  })

  test('should get resolver', async () => {
    const resolver = await client.getEnsResolver({
      name: ensAddress,
      universalResolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    })

    expect(resolver).toBe('0x5FC8d32690cc91D4c39d9d3abcBD16989F875707')
  })

  test('should get name', async () => {
    const name = await client.getEnsName({
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      universalResolverAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    })

    expect(name).toBe('public.eth')
  })
})
