/**
 * External Resolver -> CCIP-Read Gateway
 *
 * This script contains a series of tests for the Gateway. The tests cover various
 * function calls, including handling GET requests and setting values for different function types.
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { hash as namehash } from 'eth-ens-namehash'

import { doCall } from './helper'
import { NewServer, abi } from '../src/server'
import { withGetText, withSetText } from '../src/handlers'
import { TypeORMRepository } from '../src/repositories'
import { Address, Text, Domain } from '../src/entities'

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'
const TTL = '40'

describe('Gateway', () => {
  let repo: TypeORMRepository
  let datasource: DataSource
  let domain: Domain

  beforeAll(async () => {
    datasource = new DataSource({
      type: 'better-sqlite3',
      database: './test.db',
      entities: [Text, Domain, Address],
      synchronize: true,
    })
    repo = new TypeORMRepository(await datasource.initialize())

    const domainRepo = datasource.getRepository(Domain)
    domain = new Domain()
    domain.namehash = namehash('public.eth')
    domain.ttl = 40
    await domainRepo.save(domain)
  })

  afterEach(async () => {
    const entities = datasource.entityMetadatas

    for (const entity of entities) {
      const repository = datasource.getRepository(entity.name)
      await repository.clear() // Clear each entity table's content
    }
  })

  it('should handle set request for setText', async () => {
    const server = NewServer(withSetText(repo))
    const result = await doCall(
      server,
      abi,
      TEST_ADDRESS,
      'setText',
      domain.namehash,
      'avatar',
      'blockful.png',
    )

    expect(result.length).toEqual(2)
    const [value, ttl] = result
    expect(value).toEqual('avatar')
    expect((ttl as bigint).toString()).toEqual(TTL)
  })

  it('should handle GET request for text', async () => {
    const textRepo = datasource.getRepository(Text)
    const text = new Text()
    text.key = 'avatar'
    text.value = 'blockful.png'
    text.domain = domain
    text.ttl = 40
    await textRepo.save(text)

    const server = NewServer(withGetText(repo))

    const result = await doCall(
      server,
      abi,
      TEST_ADDRESS,
      'text',
      domain.namehash,
      'avatar',
    )

    expect(result.length).toEqual(2)
    const [avatar, ttl] = result
    expect(avatar).toEqual('blockful.png')
    expect((ttl as bigint).toString()).toEqual(TTL)
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
})
