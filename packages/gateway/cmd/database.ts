/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { Hex } from 'viem'
import { config } from 'dotenv'

import { NewDataSource } from '../src/datasources/postgres'
import {
  withGetText,
  withSetText,
  withGetAddr,
  withSetAddr,
  withGetContentHash,
  withSetContentHash,
} from '../src/handlers'
import { PostgresRepository } from '../src/repositories/postgres'

import { NewApp } from '../src/app'
import { withSigner } from '../src/middlewares'

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

  const app = NewApp(
    [
      withGetText(repo),
      withSetText(repo),
      withGetAddr(repo),
      withSetAddr(repo),
      withGetContentHash(repo),
      withSetContentHash(repo),
    ],
    [
      withSigner(privateKey as Hex, [
        'function text(bytes32 node, string key)',
        'function addr(bytes32 node)',
        'function contenthash(bytes32 node)',
      ]),
    ],
  )

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
