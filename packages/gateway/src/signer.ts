import { Hex, SignableMessage } from 'viem'
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts'

export class Signer {
  #account: PrivateKeyAccount

  constructor(privateKey: Hex) {
    this.#account = privateKeyToAccount(privateKey)
  }

  async sign(message: SignableMessage): Promise<Hex> {
    const signature = await this.#account.signMessage({
      message,
    })

    return signature
  }
}
