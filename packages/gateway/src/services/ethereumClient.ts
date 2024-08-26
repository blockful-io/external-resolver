import {
  Chain,
  HttpTransport,
  PublicClient,
  fromHex,
  parseAbiItem,
  Hex,
} from 'viem'

export class EthereumClient<chain extends Chain> {
  private registryAddress: Hex
  private registrarAddress: Hex
  private client: PublicClient<HttpTransport, chain>

  constructor(
    client: PublicClient<HttpTransport, chain>,
    registryAddress: Hex,
    registrarAddress: Hex,
  ) {
    this.client = client
    this.registryAddress = registryAddress
    this.registrarAddress = registrarAddress
  }

  async getOwner(node: Hex): Promise<Hex> {
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
    return owner
  }

  async verifyOwnership(node: Hex, address: Hex): Promise<boolean> {
    if (!this.registryAddress) return false
    return (await this.getOwner(node)) === address
  }

  async getResolver(node: Hex): Promise<Hex | undefined> {
    try {
      return (await this.client.readContract({
        address: this.registryAddress,
        abi: [parseAbiItem('function resolver(bytes32 node) returns(address)')],
        functionName: 'resolver',
        args: [node],
      })) as Hex
    } catch {}
  }

  async getExpireDate(labelhash: Hex): Promise<bigint> {
    try {
      return (await this.client.readContract({
        address: this.registrarAddress,
        abi: [
          parseAbiItem(
            'function nameExpires(uint256 id) view returns (uint256)',
          ),
        ],
        functionName: 'nameExpires',
        args: [fromHex(labelhash, 'bigint')],
      })) as bigint
    } catch {
      return 0n
    }
  }
}
