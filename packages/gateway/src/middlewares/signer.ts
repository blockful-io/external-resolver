import mung from 'express-mung'
import { Request as HTTPRequest } from 'express'
import {
  Abi,
  encodeFunctionResult,
  keccak256,
  encodePacked,
  toHex,
  // decodeFunctionData,
} from 'viem'

import { Response, Signer } from '../types'

export function withSigner(signer: Signer, abi: Abi) {
  return mung.json((body: Record<string, unknown>, req: HTTPRequest) => {
    const { value, ttl } = body as Response

    const sender = req.method === 'GET' ? req.params.sender : req.body.sender
    const callData = req.method === 'GET' ? req.params.callData : req.body.data
    // const inputs = decodeFunctionData({ abi, data: callData })
    const functionName = toHex(callData).slice(0, 10)
    const encodedValue = encodeFunctionResult({
      abi,
      functionName,
      result: value,
    })

    const msgHash = keccak256(
      encodePacked(
        ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
        [
          '0x1900',
          sender,
          BigInt(ttl),
          keccak256('0x'),
          // keccak256(inputs.args),
          keccak256(encodedValue),
        ],
      ),
    )
    const sig = signer.sign({ value: msgHash })
    return [encodedValue, ttl, sig]
  })
}
