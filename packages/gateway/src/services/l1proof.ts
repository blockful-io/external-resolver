import {
  Address,
  Chain,
  Hash,
  HttpTransport,
  PublicClient,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem'
import { IProofService } from '../interfaces'
import { EVMProofHelper } from './evmproof'

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class L1ProofService<chain extends Chain>
  implements IProofService<bigint>
{
  private readonly provider: PublicClient<HttpTransport, chain>
  private readonly helper: EVMProofHelper<chain>

  constructor(provider: PublicClient<HttpTransport, chain>) {
    this.provider = provider
    this.helper = new EVMProofHelper(provider)
  }

  /**
   * @dev Returns an object representing a block whose state can be proven on L1.
   */
  async getProvableBlock(): Promise<bigint> {
    const block = await this.provider.getBlock()
    if (!block) throw new Error('No block found')
    return block.number
  }

  /**
   * @dev Returns the value of a contract state slot at the specified block
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slot The slot to fetch.
   * @returns The value in `slot` of `address` at block `block`
   */
  getStorageAt(block: bigint, address: Address, slot: bigint): Promise<Hash> {
    return this.helper.getStorageAt(block, address, slot)
  }

  /**
   * @dev Fetches a set of proofs for the requested state slots.
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slots An array of slots to fetch data for.
   * @returns A proof of the given slots, encoded in a manner that this service's
   *   corresponding decoding library will understand.
   */
  async getProofs(
    blockNo: bigint,
    address: Address,
    slots: bigint[],
  ): Promise<Hash> {
    const proof = await this.helper.getProofs(blockNo, address, slots)
    const block = await this.provider.getBlock({
      blockNumber: BigInt('0x' + blockNo.toString(16)),
      includeTransactions: false,
    })
    return encodeAbiParameters(
      parseAbiParameters([
        'bytes32, (bytes[] stateTrieWitness, bytes[][] storageProofs, bytes32 stateRoot)',
      ]),
      [block.stateRoot, proof],
    )
  }
}
