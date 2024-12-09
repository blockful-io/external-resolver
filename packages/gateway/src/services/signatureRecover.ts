import { Address, recoverTypedDataAddress } from 'viem'
import { TypedSignature } from '../types'

export class SignatureRecover {
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
          { name: 'data', type: 'bytes' },
          { name: 'sender', type: 'address' },
          { name: 'expirationTimestamp', type: 'uint256' },
        ],
      },
      primaryType: 'Message',
    })
  }
}
