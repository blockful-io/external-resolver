import { Hex } from 'viem'
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts'

export class Signer {
  #account: PrivateKeyAccount

  constructor(privateKey: Hex) {
    this.#account = privateKeyToAccount(privateKey)
  }

  async sign(message: { value: string }): Promise<Hex> {
    const signature = await this.#account.signTypedData({
      message,
      primaryType: 'Text',
      types: {
        Text: 'bytes',
        // bytes32: true,
        // Address: [
        //   { name: 'coin', type: 'uint256' },
        //   { name: 'address', type: 'address' },
        // ],
        // Domain: [
        //   { name: 'ttl', type: 'uint256' },
        //   { name: 'node', type: 'bytes' },
        // ],
      },
    })

    return signature
  }
}
