import { Address, Hex, recoverTypedDataAddress } from 'viem'
import { TypedSignature } from '../types'

interface Repository {
  verifyOwnership(node: Hex, address: `0x${string}`): Promise<boolean>
}

export class OwnershipValidator {
  private repo: Repository

  constructor(repo: Repository) {
    this.repo = repo
  }

  async recoverMessageSigner({
    domain,
    signature,
    message,
  }: TypedSignature): Promise<Address> {
    return await recoverTypedDataAddress({
      signature,
      domain,
      message,
      types: {
        Message: [
          { name: 'functionSelector', type: 'bytes4' },
          { name: 'sender', type: 'address' },
          { name: 'parameters', type: 'Parameter[]' },
          { name: 'expirationTimestamp', type: 'uint256' },
        ],
        Parameter: [
          { name: 'name', type: 'string' },
          { name: 'value', type: 'string' },
        ],
      },
      primaryType: 'Message',
    })
  }

  async verifyOwnership({
    node,
    signature,
  }: {
    node: `0x${string}`
    signature: TypedSignature
  }): Promise<boolean> {
    const signer = await this.recoverMessageSigner(signature)
    return await this.repo.verifyOwnership(node, signer)
  }
}
