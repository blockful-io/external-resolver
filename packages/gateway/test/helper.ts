import * as ccipread from '@blockful/ccip-server'
import { Interface } from 'ethers/lib/utils'

/**
 * Executes a function call on the specified server using the provided ABI and arguments.
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
) {
  const iface = new Interface(abi)
  const handler = server.handlers[iface.getSighash(type)]

  // Check if the handler for the specified function type is registered
  if (!handler) throw Error('Unknown handler')

  // Encode function data using ABI and arguments
  const calldata = iface.encodeFunctionData(type, args)

  // Make a server call with encoded function data
  const result = await server.call({ to: path, data: calldata })

  // Check if the server response has a non-200 status
  if (result.status !== 200) throw Error(result.body.message)

  // Returns an empty array if the function has no outputs
  if (!handler.type.outputs) return []

  return iface.decodeFunctionResult(handler.type, result.body.data)
}
