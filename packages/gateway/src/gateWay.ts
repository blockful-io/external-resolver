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
import * as ccipread from "@chainlink/ccip-read-server";
import { Interface } from "ethers/lib/utils";

// Application Binary Interfaces
export const abi: string[] = [
  "function getSignedBalance(address addr) public view returns(uint256 balance, bytes memory sig)",
  "function setText(address addr, string text) public view returns(string result, string returned_args)",
  "function setAddr(bytes32 node, address addr) public view returns(string result, string returned_args)",
  "function addr(bytes32 node, uint coinType) public view returns(bytes memory result)",
  "function text(bytes32 node, string key) public view returns(string memory result)",
];
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
async function doCall(
  server: ccipread.Server,
  abi: string[],
  path: string,
  type: string,
  args: any[]
) {
  const iface = new Interface(abi);
  const handler = server.handlers[iface.getSighash(type)];

  // Check if the handler for the specified function type is registered
  if (!handler) {
    throw Error("Unknown handler");
  }
  // Encode function data using ABI and arguments
  const calldata = iface.encodeFunctionData(type, args);
  // Make a server call with encoded function data
  const result = await server.call({ to: path, data: calldata });

  // Check if the server response has a non-200 status
  if (result.status !== 200) {
    throw Error(result.body.message);
  }
  // Decode the function result if the function has outputs, otherwise return an empty array
  if (handler.type.outputs !== undefined) {
    return iface.decodeFunctionResult(handler.type, result.body.data);
  } else {
    return [];
  }
}

// Creating a ccip-read server
const server = new ccipread.Server();

// Adding a handlers for the gateway
server.add(abi, [
  {
    type: "getSignedBalance",
    func: (_args) => {
      // Implement logic or call dataBase / Contract
      return Promise.resolve([1000, "0x123456"]);
    },
  },
  {
    type: "setText",
    func: (_args) => {
      const [addr, newText] = _args;
      // Implement logic or call dataBase / Contract
      return Promise.resolve(["Did it!", newText]);
    },
  },
  {
    type: "setAddr",
    func: (args) => {
      const [node, addr] = args;
      // Implement logic or call dataBase / Contract
      return Promise.resolve([
        "Address Set",
        `Node: ${node}, Address: ${addr}`,
      ]);
    },
  },
  {
    type: "addr",
    func: (args) => {
      const [node, coinType] = args;
      // Implement logic or call dataBase / Contract
      const multicoinAddress = "0x123456";
      return Promise.resolve([multicoinAddress]);
    },
  },

  {
    type: "text",
    func: (args) => {
      const [node, key] = args;
      // Implement logic or call dataBase / Contract
      const textValue = "This is the text value storage.";
      return Promise.resolve([textValue]);
    },
  },
]);

// Exporting the created gateway and the function that allow communication with it.
export { server, doCall };
