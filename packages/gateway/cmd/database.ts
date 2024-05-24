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
  withGetContentHash,
  withSetContentHash,
  withQuery,
  withRegisterDomain,
} from '../src/handlers'
import { abi } from '../src/abi'
import { PostgresRepository } from '../src/repositories/postgres'
import { NewServer } from '../src/server'
import { withLogger, withSigner } from '../src/middlewares'
import { OwnershipValidator } from '../src/services'

config({
  path: process.env.ENV_FILE || '../env',
})

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required')
  }
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is required')
  }

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new PostgresRepository(dbclient)
  const validator = new OwnershipValidator(repo)

  const app = NewServer(
    withQuery(), // required for Universal Resolver integration
    withGetText(repo),
    withSetText(repo, validator),
    withGetAddr(repo),
    withSetAddr(repo, validator),
    withGetContentHash(repo),
    withSetContentHash(repo, validator),
    withRegisterDomain(repo, validator),
  ).makeApp(
    '/',
    withLogger({ abi, debug: process.env.DEBUG === 'true' }),
    withSigner(privateKey as Hex, [
      'function text(bytes32 node, string key)',
      'function addr(bytes32 node)',
      'function contenthash(bytes32 node)',
    ]),
  )

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
