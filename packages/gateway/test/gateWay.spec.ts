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
import { server, doCall, abi } from "../src/gateWay";
import ethers from "ethers";

// Defining the port where the gateway will run
const port = 3001;
const app = server.makeApp("/");

// Creating an example of Bytes32 variable to represent the Node.
const node = createBytes32("node");
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

// Function to convert string into bytes32
function createBytes32(data: string): string {
  return ethers.utils.id(data);
}

// Testing calls to the gateway
describe("Gateway", () => {
  // Setting up the server before running tests
  beforeAll(() => {
    app.listen(port, () => {
      console.log(`Gateway is running!`);
    });
  });

  // Test case for handling GET request for getSignedBalance
  it("should handle GET request for getSignedBalance", async () => {
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
