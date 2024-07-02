import { Address, Hex } from 'viem'
import { TypedSignature } from '../types'

interface DomainOwnerVerifier {
  verifyOwnership(node: Hex, address: `0x${string}`): Promise<boolean>
}

interface SignatureRecover {
  recoverMessageSigner({
    domain,
    signature,
    message,
  }: TypedSignature): Promise<Address>
}

export class OwnershipValidator {
  private recover: SignatureRecover
  private ownershipVerifiers: DomainOwnerVerifier[]

  constructor(recover: SignatureRecover, verifier: DomainOwnerVerifier[]) {
    this.recover = recover
    this.ownershipVerifiers = verifier
  }

  async verifyOwnership({
    node,
    signature,
  }: {
    node: `0x${string}`
    signature: TypedSignature
  }): Promise<boolean> {
    const signer = await this.recover.recoverMessageSigner(signature)
    const validations = await Promise.all(
      this.ownershipVerifiers.map((v) => v.verifyOwnership(node, signer)),
    )

    // at least one of the validators should return true (Ethereum or DB)
    return validations.includes(true)
  }
}
