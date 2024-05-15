import { Address, Hex, recoverMessageAddress } from 'viem'

interface Repository {
  verifyOwnership(node: Hex, address: `0x${string}`): Promise<boolean>
}

export class OwnershipValidator {
  private repo: Repository

  constructor(repo: Repository) {
    this.repo = repo
  }

  async recoverMessageSigner(data: Hex, signature: Hex): Promise<Address> {
    return await recoverMessageAddress({
      message: { raw: data as Hex },
      signature: signature as Hex,
    })
  }

  async verifyOwnership({
    node,
    data,
    signature,
  }: {
    node: `0x${string}`
    data: `0x${string}`
    signature: `0x${string}`
  }): Promise<boolean> {
    const signer = await this.recoverMessageSigner(data, signature)
    return await this.repo.verifyOwnership(node, signer)
  }
}
