import {
  Address,
  Chain,
  Hash,
  HttpTransport,
  PublicClient,
  toHex,
  zeroHash,
} from 'viem'

export interface StateProof {
  stateTrieWitness: `0x${string}`[]
  storageProofs: `0x${string}`[][]
  stateRoot: `0x${string}`
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Optimism Bedrock network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class EVMProofHelper<chain extends Chain> {
  private readonly provider: PublicClient<HttpTransport, chain>

  constructor(provider: PublicClient<HttpTransport, chain>) {
    this.provider = provider
  }

  /**
   * @dev Returns the value of a contract state slot at the specified block
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slot The slot to fetch.
   * @returns The value in `slot` of `address` at block `block`
   */
  async getStorageAt(
    blockNo: bigint,
    address: Address,
    slot: bigint,
  ): Promise<Hash> {
    try {
      const storage = await this.provider.getStorageAt({
        blockNumber: blockNo,
        address: address.toLowerCase() as Hash,
        slot: ('0x' + slot.toString(16)) as Hash,
      })
      return storage || zeroHash
    } catch (err) {
      return zeroHash
    }
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
  ): Promise<StateProof> {
    const proofs = await this.provider.getProof({
      address,
      storageKeys: slots.map((slot) => toHex(slot)),
      blockNumber: BigInt('0x' + blockNo.toString(16)),
    })
    return {
      stateTrieWitness: proofs.accountProof,
      storageProofs: proofs.storageProof.map((proof) => proof.proof),
      stateRoot: proofs.storageHash,
    }
  }
}
