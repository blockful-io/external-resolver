/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This file sets up a server instance to act as a gateway for handling specific function calls,
 * providing an interface for communication with external systems such as databases or contracts.
 * The gateway includes predefined handlers for various function types, allowing users to execute
 * these functions by making calls to the server. Additionally, the script exports a utility function
 * 'doCall' to facilitate making function calls on the server using provided ABIs and arguments.
 *
 * Example of usage:
 * ```typescript
 * const result = await doCall(server, abi_getSignedBalance, TEST_ADDRESS, "getSignedBalance", [TEST_ADDRESS]);
 * console.log(result);
 * ```
 *
 */
import * as ccip from "@chainlink/ccip-read-server";

// Application Binary Interfaces
const abi: string[] = [
  "function setText(bytes32 node, string calldata key, string calldata value)",
  "function text(bytes32 node, string key) view returns (string memory)",
  "function setAddr(bytes32 node, address addr)",
  "function setAddr(bytes32 node, uint coinType, bytes calldata addr)",
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint coinType) view returns (byte memory)",
  "function contenthash(bytes32 node) view returns (bytes memory)",
  "function setContenthash(bytes32 node, bytes calldata hash)"
];

function NewServer(...opts: ccip.HandlerDescription[]): ccip.Server {
  const server = new ccip.Server();

  server.add(abi, opts);

  return server;
}

// Exporting the created gateway and the function that allow communication with it.
export { NewServer, abi };
