/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This file sets up a server instance to act as a gateway for handling specific function calls,
 * providing an interface for communication with external systems such as databases or contracts.
 * The gateway includes predefined handlers for various function types, allowing users to execute
 * these functions by making calls to the server.
 */
import * as ccip from '@blockful/ccip-server'
import { abi } from './abi'

function NewServer(...opts: ccip.HandlerDescription[]): ccip.Server {
  const server = new ccip.Server()

  server.add(abi, opts)

  return server
}

// Exporting the created gateway and the function that allow communication with it.
export { NewServer, abi }
