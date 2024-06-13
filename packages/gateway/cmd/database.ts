/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { Hex } from 'viem'

import { NewDataSource } from '../src/datasources/postgres'
import {
  withGetText,
  withSetText,
  withGetAddr,
  withSetAddr,
  withGetAddrByCoin,
  withSetAddrByCoin,
  withGetContentHash,
  withSetContentHash,
  withQuery,
  withRegisterDomain,
} from '../src/handlers'
import { abi } from '../src/abi'
import { PostgresRepository } from '../src/repositories/postgres'
import { withLogger, withSigner } from '../src/middlewares'
import { OwnershipValidator } from '../src/services'
import * as ccip from '@blockful/ccip-server'

config({
  path: process.env.ENV_FILE || '../env',
})

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required')
  }
  const privateKey = process.env.GATEWAY_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('GATEWAY_PRIVATE_KEY is required')
  }

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new PostgresRepository(dbclient)
  const validator = new OwnershipValidator(repo)

  const server = new ccip.Server()
  server.app.use(withSigner(privateKey as Hex))
  server.app.use(withLogger({ abi, debug: process.env.DEBUG === 'true' }))

  server.add(
    abi,
    withQuery(), // required for Universal Resolver integration
    withGetText(repo),
    withSetText(repo, validator),
    withGetAddr(repo),
    withGetAddrByCoin(repo),
    withSetAddr(repo, validator),
    withSetAddrByCoin(repo, validator),
    withGetContentHash(repo),
    withSetContentHash(repo, validator),
    withRegisterDomain(repo, validator),
  )

  const port = process.env.PORT || 3000
  server.makeApp('/').listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
