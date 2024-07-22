import 'reflect-metadata'
import {
  Chain,
  HttpTransport,
  PublicClient,
  fromHex,
  getChainContractAddress,
  parseAbiItem,
  Hex,
} from 'viem'

export class EthereumClient<chain extends Chain> {
  private registryAddress: string
  private client: PublicClient<HttpTransport, chain>

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

  async verifyOwnership(node: Hex, address: Hex): Promise<boolean> {
    if (!this.registryAddress) return false

    let owner = (await this.client.readContract({
      address: this.registryAddress as Hex,
      abi: [
        parseAbiItem('function owner(bytes32 node) view returns (address)'),
      ],
      functionName: 'owner',
      args: [node],
    })) as Hex

    try {
      // handling NameWrapper owner
      owner = (await this.client.readContract({
        address: owner,
        abi: [
          parseAbiItem(
            'function ownerOf(uint256 id) view returns (address owner)',
          ),
        ],
        functionName: 'ownerOf',
        args: [fromHex(node, 'bigint')],
      })) as Hex
    } catch {
      /** error is expected when it isn't a contract */
    }
    return owner === address
  }
}
