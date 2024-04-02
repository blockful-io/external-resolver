import mung from 'express-mung'
import { Request as HTTPRequest } from 'express'
import {
  keccak256,
  encodePacked,
  Hex,
  encodeAbiParameters,
  parseAbiParameters,
  verifyMessage,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export function withSigner(privateKey: Hex) {
  return mung.jsonAsync(
    async (body: Record<string, unknown>, req: HTTPRequest) => {
      const signer = privateKeyToAccount(privateKey)

      const sender = req.method === 'GET' ? req.params.sender : req.body.sender
      const callData =
        req.method === 'GET' ? req.params.callData : req.body.data

      // viem's query(OffchainLookupCallData[] memory data)
      if (callData.slice(0, 10) === '0xa780bab6') {
        return body
      }

      const ttl = 1711975661 + 100000
      // const hexCalldata = keccak256(callData)
      // const hexData = keccak256(body.data as Hex)
      const msgHash = keccak256(
        encodePacked(
          ['bytes', 'address', 'uint64', 'bytes', 'bytes'],
          [
            '0x1900',
            sender,
            BigInt(ttl),
            keccak256(callData),
            keccak256(body.data as Hex),
          ],
        ),
      )

      const sig = await signer.signMessage({ message: msgHash })
      // const verified = await verifyMessage({
      //   address: signer.address,
      //   message: msgHash,
      //   signature: sig,
      // })

      return encodeAbiParameters(parseAbiParameters('bytes,uint64,bytes'), [
        body.data as Hex,
        BigInt(ttl),
        sig as Hex,
      ])
    },
  )
}
