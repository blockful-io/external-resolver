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
import { describe, it, expect } from 'vitest'

import { doCall } from './helper'
import { NewServer, abi } from '../src/server'

// Creating an example of Bytes32 variable to represent the Node.
// const node = createBytes32("node");
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

// Function to convert string into bytes32
// function createBytes32(data: string): string {
//   return ethers.utils.id(data);
// }

describe('Gateway', () => {
  it('should handle set request for setText', async () => {
    const server = NewServer()
    const result = await doCall(server, abi, TEST_ADDRESS, 'setText', [
      TEST_ADDRESS,
      'New String',
    ])

    // Assertions for the expected results
    expect(result.length).to.equal(2)
    expect(result[0]).to.equal('Did it!')
    expect(result[1]).to.equal('New String')
  })

  // it('should handle set request for setAddr', async () => {
  //   const address = '0x1234567890123456789012345678901234567890'
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'setAddr', [
  //     node,
  //     address,
  //   ])

  //   // Assertions for the expected results
  //   expect(result.length).to.equal(2)
  //   expect(result[0]).to.equal('Address Set')
  //   expect(result[1]).to.equal(`Node: ${node}, Address: ${address}`)
  // })

  // it('should handle GET request for addr', async () => {
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'addr', [node, 42])

  //   // Assertions for the expected results
  //   expect(result.length).to.equal(1)
  //   expect(result[0]).to.equal('0x123456')
  // })

  // it('should handle GET request for text', async () => {
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'text', [
  //     node,
  //     'Key123',
  //   ])

  //   // Assertions for the expected results
  //   expect(result.length).to.equal(1)
  //   expect(result[0]).to.equal('This is the text value storage.')
  // })
})
