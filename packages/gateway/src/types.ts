import { Address, Hash, Hex, SignableMessage } from 'viem'

export type Response = {
  value: string
  ttl: number
}

export type DomainProps = {
  node: string
}

export type SetContentHashProps = {
  node: string
  contenthash: `0x${string}`
}

export type SetAddressProps = {
  node: string
  addr: string
  coin?: number
}

export type GetAddressProps = {
  node: string
  coin?: number
}

export type SetTextProps = {
  node: string
  key: string
  value: string
}

export type GetTextProps = {
  node: string
  key: string
}

export interface Signer {
  sign: (msg: SignableMessage) => Promise<Hex>
}

// eslint-disable-next-line
export interface ProvableBlock { }

export interface IProofService<T extends ProvableBlock> {
  /**
   * @dev Returns an object representing a block whose state can be proven on L1.
   */
  getProvableBlock(): Promise<T>

  /**
   * @dev Returns the value of a contract state slot at the specified block
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slot The slot to fetch.
   * @returns The value in `slot` of `address` at block `block`
   */
  getStorageAt(block: T, address: Address, slot: bigint): Promise<Hash>

  /**
   * @dev Fetches a set of proofs for the requested state slots.
   * @param block A `ProvableBlock` returned by `getProvableBlock`.
   * @param address The address of the contract to fetch data from.
   * @param slots An array of slots to fetch data for.
   * @returns A proof of the given slots, encoded in a manner that this service's
   *   corresponding decoding library will understand.
   */
  getProofs(block: T, address: Address, slots: bigint[]): Promise<Hash>
}

/**
 * Interface for a block cache.
 */
export interface IBlockCache {
  /**
   * Retrieves a block from the cache.
   * @param nodeIndex The index of the node.
   * @returns A promise that resolves to the retrieved block, or null if the block is not found.
   */
  getBlock(nodeIndex: bigint): Promise<{
    nodeIndex: bigint
    block: Record<string, string>
    sendRoot: string
  } | null>

  /**
   * Sets a block in the cache.
   * @param nodeIndex The index of the node.
   * @param block The block data to be stored.
   * @param sendRoot The send root associated with the block.
   * @returns A promise that resolves when the block is successfully set in the cache.
   */
  setBlock(
    nodeIndex: bigint,
    block: Record<string, string>,
    sendRoot: string,
  ): Promise<void>
}
