import 'reflect-metadata'
import {
  Chain,
  HttpTransport,
  PublicClient,
  getChainContractAddress,
} from 'viem'

import { abi } from '@blockful/contracts/out/ENSRegistry.sol/ENSRegistry.json'
import { abi as nameWrapperABI } from '@blockful/contracts/out/NameWrapper.sol/NameWrapper.json'

export class EthereumClient<chain extends Chain> {
  private client: PublicClient<HttpTransport, chain>

  private registryAddress: string

  constructor(
    client: PublicClient<HttpTransport, chain>,
    ensRegistry?: string,
  ) {
    this.client = client
    this.registryAddress =
      ensRegistry ||
      getChainContractAddress({
        chain: client.chain!,
        contract: 'ensRegistry',
      })
  }

  async verifyOwnership(
    node: `0x${string}`,
    address: `0x${string}`,
  ): Promise<boolean> {
    if (!this.registryAddress) return false

    let owner = (await this.client.readContract({
      address: this.registryAddress as `0x${string}`,
      abi,
      functionName: 'owner',
      args: [node],
    })) as `0x${string}`

    try {
      // handling NameWrapper owner
      owner = (await this.client.readContract({
        address: owner,
        abi: nameWrapperABI,
        functionName: 'ownerOf',
        args: [node],
      })) as `0x${string}`
    } catch {
      /** error is expected when it isn't a contract */
    }
    return owner === address
  }
}
