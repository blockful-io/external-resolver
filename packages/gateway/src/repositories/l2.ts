/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-return */
import 'reflect-metadata'
import { anvil } from 'viem/chains'
import { abi as abiOffchainResolver } from '@blockful/contracts/out/PublicResolver.sol/PublicResolver.json'

import {
  SetTextProps,
  GetTextProps,
  SetAddressProps,
  GetAddressProps,
  SetContentHashProps,
  Response,
} from '../types'
import { BaseError, PublicClient, createPublicClient, http } from 'viem'

export class L2Repository {
  publicClient: PublicClient
  baseTtl: number
  l2ResolverAddress: string
  constructor(_l2URL: string, _l2ResolverAddress: string) {
    this.publicClient = createPublicClient({
      chain: anvil, // Can be arbitrum
      transport: http(_l2URL),
    })
    this.baseTtl = 100000000000000
    this.l2ResolverAddress = _l2ResolverAddress
  }

  async setContentHash({
    node,
    contenthash,
  }: SetContentHashProps): Promise<void> {
    return
  }

  async getContentHash({
    node,
  }: GetAddressProps): Promise<Response | undefined> {
    return
  }

  async setAddr({ node, addr: address, coin }: SetAddressProps): Promise<void> {
    return
  }

  async getAddr({
    node,
    coin,
  }: GetAddressProps): Promise<Response | undefined> {
    try {
      const address = await this.publicClient.readContract({
        functionName: 'addr',
        address: this.l2ResolverAddress as `0x${string}`,
        abi: abiOffchainResolver,
        args: [node],
      })
      if (!address) return
      return { value: address as string, ttl: this.baseTtl }
    } catch (error) {
      const customError = error as BaseError
      console.log(customError.message)
    }
  }

  async setText({ node, key, value }: SetTextProps): Promise<void> {
    return
  }

  async getText({ node, key }: GetTextProps): Promise<Response | undefined> {
    try {
      const address = await this.publicClient.readContract({
        functionName: 'text',
        address: this.l2ResolverAddress as `0x${string}`,
        abi: abiOffchainResolver,
        args: [node, key],
      })
      if (!address) return
      return { value: address as string, ttl: this.baseTtl }
    } catch (error) {
      const customError = error as BaseError
      console.log(customError.message)
    }
  }
}
