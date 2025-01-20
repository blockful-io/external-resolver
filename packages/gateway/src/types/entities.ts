import { SignableMessage } from 'viem'

export type PubKey = {
  x: string
  y: string
}

export interface Signer {
  sign: (msg: SignableMessage) => Promise<`0x${string}`>
}

/**
 * @notice Struct used to define the domain of the typed data signature, defined in EIP-712.
 * @param name The user friendly name of the contract that the signature corresponds to.
 * @param version The version of domain object being used.
 * @param chainId The ID of the chain that the signature corresponds to (ie Ethereum mainnet: 1, Goerli testnet: 5, ...).
 * @param verifyingContract The address of the contract that the signature pertains to.
 */
export type DomainData = {
  name: string
  version: string
  chainId: number
  verifyingContract: `0x${string}`
}

/**
 * @notice Struct used to define the message context used to construct a typed data signature, defined in EIP-712,
 * to authorize and define the deferred mutation being performed.
 * @param callData The encoded function to be called
 * @param sender The address of the user performing the mutation (msg.sender).
 */
export type MessageData = {
  data: `0x${string}`
  sender: `0x${string}`
  expirationTimestamp: bigint
}

export type TypedSignature = {
  signature: `0x${string}`
  domain: DomainData
  message: MessageData
}

export interface OwnershipValidator {
  verifyOwnership(args: {
    node: `0x${string}`
    signature: TypedSignature
  }): Promise<boolean>
}
