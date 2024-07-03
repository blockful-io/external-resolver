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
}
