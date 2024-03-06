/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 * The tested function types include:
 * - getSignedBalance
 * - setText
 * - setAddr
 * - addr
 * - setTextRecord
 * - text
 *
 * It utilizes the 'vitest' testing framework for organizing and running the tests.
 *
 */
import { describe, it, beforeAll, expect } from "vitest";
import { NewServer, abi } from "../src/server";
import ethers from "ethers";
import * as ccipread from "@chainlink/ccip-read-server";
import { Interface } from "ethers/lib/utils";

// Defining the port where the gateway will run
// const port = 3001;
// const app = NewServer.makeApp("/");

// Creating an example of Bytes32 variable to represent the Node.
// const node = createBytes32("node");
// const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

// Function to convert string into bytes32
// function createBytes32(data: string): string {
//   return ethers.utils.id(data);
// }

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

// Testing calls to the gateway
describe("Gateway", () => {
  // let server: ccipread.Server;

  // Setting up the server before running each test
  // beforeEach(() => {
  //   app.listen(port, () => {
  //     console.log(`Gateway is running!`);
  //   });
  // });

  // Test case for handling GET request for getSignedBalance
  it("should handle GET request for getSignedBalance", async () => {
    // const server = NewServer()

    const result = await doCall(server, abi, TEST_ADDRESS, "getSignedBalance", [
      TEST_ADDRESS,
    ]);

    // Assertions for the expected results
    expect(result.length).to.equal(2);
    expect(result[0].toNumber()).to.equal(1000);
    expect(result[1]).to.equal("0x123456");
  });

  // Test case for handling set request for setText
  it("should handle set request for setText", async () => {
    const result = await doCall(server, abi, TEST_ADDRESS, "setText", [
      TEST_ADDRESS,
      "New String",
    ]);

    // Assertions for the expected results
    expect(result.length).to.equal(2);
    expect(result[0]).to.equal("Did it!");
    expect(result[1]).to.equal("New String");
  });

  // Test case for handling set request for setAddr
  it("should handle set request for setAddr", async () => {
    const address = "0x1234567890123456789012345678901234567890";
    const result = await doCall(server, abi, TEST_ADDRESS, "setAddr", [
      node,
      address,
    ]);

    // Assertions for the expected results
    expect(result.length).to.equal(2);
    expect(result[0]).to.equal("Address Set");
    expect(result[1]).to.equal(`Node: ${node}, Address: ${address}`);
  });

  // Test case for handling GET request for addr
  it("should handle GET request for addr", async () => {
    const result = await doCall(server, abi, TEST_ADDRESS, "addr", [node, 42]);

    // Assertions for the expected results
    expect(result.length).to.equal(1);
    expect(result[0]).to.equal("0x123456");
  });

  // Test case for handling GET request for text
  it("should handle GET request for text", async () => {
    const result = await doCall(server, abi, TEST_ADDRESS, "text", [
      node,
      "Key123",
    ]);

    // Assertions for the expected results
    expect(result.length).to.equal(1);
    expect(result[0]).to.equal("This is the text value storage.");
  });
});
