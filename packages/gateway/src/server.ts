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

// Application Binary Interfaces
export const abi: string[] = [
  "function getSignedBalance(address addr) public view returns(uint256 balance, bytes memory sig)",
  "function setText(address addr, string text) public view returns(string result, string returned_args)",
  "function setAddr(bytes32 node, address addr) public view returns(string result, string returned_args)",
  "function addr(bytes32 node, uint coinType) public view returns(bytes memory result)",
  "function text(bytes32 node, string key) public view returns(string memory result)",
];

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
export { server };
