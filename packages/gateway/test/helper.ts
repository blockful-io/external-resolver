import * as ccipread from '@blockful/ccip-server'
import {
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  toFunctionHash,
  getAbiItem,
  AbiFunction,
} from 'viem'

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
 * @param {any[]} args - The arguments required for the function call.
 * @throws {Error} - Throws an error if the handler for the specified function type is unknown or if the server response has a non-200 status.
 */
export async function doCall(
  server: ccipread.Server,
  abi: string[],
  path: string,
  type: string,
  ...args: any[] // eslint-disable-line
): Promise<{ data: Array<unknown>; ttl?: bigint; error?: Error }> {
  const iface = parseAbi(abi)
  const func = getAbiItem({ abi: iface, name: type })
  if (!func) {
    throw Error('Unknown handler')
  }

  const funcSelector = toFunctionHash(func as AbiFunction)
  const handler = server.handlers[funcSelector.slice(0, 10)]

  // Check if the handler for the specified function type is registered
  if (!handler) throw Error('Unknown handler')

  // Encode function data using ABI and arguments
  const calldata = encodeFunctionData({ abi: iface, functionName: type, args })

  // Make a server call with encoded function data
  const result = await server.call({ to: path, data: calldata })

  // Check if the server response has a non-200 status
  if (result.status !== 200)
    return { data: [], error: Error(result.body.error) }

  // Returns an empty array if the function has no outputs
  if (!handler.type.outputs) return { data: [] }

  const decodedResponse = decodeFunctionResult({
    abi: iface,
    functionName: type,
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
