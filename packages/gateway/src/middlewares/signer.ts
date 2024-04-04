import mung from 'express-mung'
import { Request as HTTPRequest } from 'express'
import {
  keccak256,
  encodePacked,
  Hex,
  encodeAbiParameters,
  parseAbiParameters,
  toFunctionSelector,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

/**
 * sign read data from the gateway in order to verify authenticity on the
 * Off-chain resolver callback
 *
 * @param {Hex} privateKey
 * @param {string[]} function signatures that the middleware should be applied to
 * @return {*}
 */
export function withSigner(privateKey: Hex, selectors: string[]) {
  return mung.jsonAsync(
    async (body: Record<string, unknown>, req: HTTPRequest) => {
      const sender = req.method === 'GET' ? req.params.sender : req.body.sender
      const callData =
        req.method === 'GET' ? req.params.callData : req.body.data

      if (!selectors.map(toFunctionSelector).includes(callData.slice(0, 10))) {
        return body
      }

      const ttl = 1711975661n + 100000n // TODO receive it from domain
      const msgHash = makeMessageHash(sender, ttl, callData, body.data as Hex)

      const signer = privateKeyToAccount(privateKey)
      const sig = await signer.signMessage({ message: { raw: msgHash } })

      return encodeAbiParameters(parseAbiParameters('bytes,uint64,bytes'), [
        body.data as Hex,
        BigInt(ttl),
        sig as Hex,
      ])
    },
  )
}

export function makeMessageHash(
  sender: Hex,
  ttl: bigint,
  calldata: Hex,
  response: Hex,
): Hex {
  return keccak256(
    encodePacked(
      ['bytes', 'address', 'uint64', 'bytes', 'bytes'],
      ['0x1900', sender, ttl, keccak256(calldata), keccak256(response)],
    ),
  )
}
