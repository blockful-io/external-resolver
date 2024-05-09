/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This file sets up a server instance to act as a gateway for handling specific function calls,
 * providing an interface for communication with external systems such as databases or contracts.
 * The gateway includes predefined handlers for various function types, allowing users to execute
 * these functions by making calls to the server.
 */
import * as ccip from '@blockful/ccip-server'

// Application Binary Interfaces
const abi: string[] = [
  'function query((address sender, string[] urls,bytes callData)[] memory data) external returns (bool[] memory failures, bytes[] memory responses)',
  'function setText(bytes32 node, string calldata key, string calldata value)',
  'function text(bytes32 node, string key) view returns (string)',
  'function setAddr(bytes32 node, address addr)',
  'function addr(bytes32 node) view returns (address)',
  // 'function setAddr(bytes32 node, uint coinType, bytes calldata addr)',
  // 'function addr(bytes32 node, uint coinType) view returns (byte memory)',
  'function contenthash(bytes32 node) view returns (bytes memory)',
  'function setContenthash(bytes32 node, bytes calldata contenthash)',
  'function getStorageSlots(address addr, bytes32[] memory commands, bytes[] memory constants) external view returns(bytes memory witness)',
  'function register(bytes32 node, uint32 ttl, bytes32 signature)',
]

function NewServer(...opts: ccip.HandlerDescription[]): ccip.Server {
  const server = new ccip.Server()

  server.add(abi, opts)

  return server
}

// Exporting the created gateway and the function that allow communication with it.
export { NewServer, abi }
