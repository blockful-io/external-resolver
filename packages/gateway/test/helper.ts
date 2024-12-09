import * as ccipread from '@blockful/ccip-server'
import {
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  toFunctionHash,
  getAbiItem,
  AbiFunction,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { MessageData, TypedSignature } from '../src/types'

export async function signData({
  func,
  sender,
  pvtKey,
}: {
  func: AbiFunction
  sender: `0x${string}`
  pvtKey: `0x${string}`
}): Promise<TypedSignature> {
  const signer = privateKeyToAccount(pvtKey)
  const domain = {
    name: 'DatabaseResolver',
    version: '1',
    chainId: 1,
    verifyingContract: sender,
  }
  const message: MessageData = {
    data: toFunctionHash(func),
    sender,
    expirationTimestamp: 9999999n,
  }
  return {
    domain,
    message,
    signature: await signer.signTypedData({
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
    }),
  }
}

/**
 * Executes a function call on the specified server using the provided ABI and arguments.
 *
 * Example of usage:
 * ```typescript
 * const result = await doCall(server, abi_getSignedBalance, TEST_ADDRESS, "getSignedBalance", [TEST_ADDRESS]);
 * ```
 *
 * @param {ccipread.Server} server - The server instance to perform the function call.
 * @param {string[]} abi - The ABI (Application Binary Interface) array describing the function.
 * @param {string} path - The path or address to which the call is made.
 * @param {string} type - The type of the function to be called.
 * @param {0xstring} type - The private key used for signing the calldata required for writing calls
 * @param {any[]} args - The arguments required for the function call.
 * @throws {Error} - Throws an error if the handler for the specified function type is unknown or if the server response has a non-200 status.
 */
export async function doCall({
  server,
  abi,
  sender,
  method,
  pvtKey,
  args,
}: {
  server: ccipread.Server
  abi: string[]
  sender: `0x${string}`
  method: string
  pvtKey?: `0x${string}`
  args: unknown[]
}): Promise<{ data: Array<unknown>; ttl?: string; error?: Error }> {
  const iface = parseAbi(abi)
  const func = getAbiItem({ abi: iface, name: method }) as AbiFunction
  if (!func) {
    throw Error('Unknown handler')
  }

  const funcHash = toFunctionHash(func)
  const funcSelector = funcHash.slice(0, 10) as `0x${string}`
  const handler = server.handlers[funcSelector]

  // Check if the handler for the specified function type is registered
  if (!handler) throw Error('Unknown handler')

  // Encode function data using ABI and arguments
  const calldata = encodeFunctionData({
    abi: iface,
    functionName: method,
    args,
  })

  const signature = pvtKey && (await signData({ pvtKey, func, sender }))

  // Make a server call with encoded function data
  const result = await server.call({ to: sender, data: calldata, signature })

  // Check if the server response has a non-200 status
  if (result.status !== 200) return { data: [], error: result.body.error }

  // Returns an empty array if the function has no outputs
  if (!handler.type.outputs) return { data: [] }

  const decodedResponse = decodeFunctionResult({
    abi: iface,
    functionName: method,
    data: result.body.data,
  })
  switch (decodedResponse) {
    case undefined:
      return { data: [] }
    case Object:
      return { data: Object.values(decodedResponse), ttl: result.body?.ttl }
    default:
      return { data: [decodedResponse], ttl: result.body?.ttl }
  }
}

export function serializeTypedSignature(signature: TypedSignature) {
  return {
    ...signature,
    message: {
      ...signature.message,
      expirationTimestamp: signature.message.expirationTimestamp.toString(),
    },
  }
}
