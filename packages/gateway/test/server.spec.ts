/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import { DataSource } from 'typeorm'
import { describe, it, expect } from 'vitest'
import { hash as namehash } from 'eth-ens-namehash'
import { doCall } from './helper'
import { NewServer, abi } from '../src/server'
import { withSetText } from '../src/handlers'
import { TypeORMRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('Gateway', () => {
  it('should handle set request for setText', async () => {
    const repo = new TypeORMRepository(
      new DataSource({
        type: 'better-sqlite3',
        database: './db',
        entities: [Text, Domain, Address],
      }),
    )
    const server = NewServer(withSetText(repo))
    const result = await doCall(
      server,
      abi,
      TEST_ADDRESS,
      'setText',
      namehash('public.eth'),
      'avatar',
      'blockful.png',
    )

    // // Assertions for the expected results
    expect(result.length).toEqual(2)
    // expect(result[0]).toEqual('Did it!')
    // expect(result[0]).toEqual('Did it!')
  })

  // it('should handle set request for setAddr', async () => {
  //   const address = '0x1234567890123456789012345678901234567890'
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'setAddr', [
  //     node,
  //     address,
  //   ])

  //   // Assertions for the expected results
  //   expect(result.length).toEqual(2)
  //   expect(result[0]).toEqual('Address Set')
  //   expect(result[1]).toEqual(`Node: ${node}, Address: ${address}`)
  // })

  // it('should handle GET request for addr', async () => {
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'addr', [node, 42])

  //   // Assertions for the expected results
  //   expect(result.length).toEqual(1)
  //   expect(result[0]).toEqual('0x123456')
  // })

  // it('should handle GET request for text', async () => {
  //   const result = await doCall(server, abi, TEST_ADDRESS, 'text', [
  //     node,
  //     'Key123',
  //   ])

  //   // Assertions for the expected results
  //   expect(result.length).toEqual(1)
  //   expect(result[0]).toEqual('This is the text value storage.')
  // })
})
