import { SignableMessage } from 'viem'
import { Domain } from './entities'

export type Response = {
  value: string
  ttl: number
}

export type WritingProps = {
  data: `0x${string}`
  signature: `0x${string}`
}

export type DomainProps = Pick<Domain, 'node'>
export type RegisterDomainProps = Pick<Domain, 'node' | 'owner' | 'ttl'>
export type TransferDomainProps = Pick<Domain, 'node' | 'owner'>
export type SetContentHashProps = Pick<Domain, 'node' | 'contenthash'>

export type SetAddressProps = {
  node: `0x${string}`
  addr: string
  coin: string
}

export type GetAddressProps = {
  node: `0x${string}`
  coin: string
}

export type SetTextProps = {
  node: `0x${string}`
  key: string
  value: string
}

export type GetTextProps = {
  node: `0x${string}`
  key: string
}

export type SetAbiProps = {
  node: `0x${string}`
  value: string
}

export type GetAbiProps = {
  node: `0x${string}`
}

export type SetPubkeyProps = {
  node: `0x${string}`
  x: `0x${string}`
  y: `0x${string}`
}

export type GetPubkeyProps = {
  node: `0x${string}`
}

export type PubKey = {
  x: string
  y: string
}

export type GetPubkeyResponse = {
  value: PubKey
  ttl: number
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
 * @notice Struct used to define a parameter for off-chain Database Handler deferral.
 * @param name The variable name of the parameter.
 * @param value The string encoded value representation of the parameter.
 */
export type Parameter = {
  name: string
  value: string
}

/**
 * @notice Struct used to define the message context used to construct a typed data signature, defined in EIP-712,
 * to authorize and define the deferred mutation being performed.
 * @param functionSelector The function selector of the corresponding mutation.
 * @param sender The address of the user performing the mutation (msg.sender).
 * @param parameter[] A list of <key, value> pairs defining the inputs used to perform the deferred mutation.
 */
export type MessageData = {
  functionSelector: `0x${string}`
  sender: `0x${string}`
  parameters: Parameter[]
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
