/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { Hex } from 'viem'
import { config } from 'dotenv'

import { NewDataSource } from './datasources/typeorm'
import {
  withGetText,
  withSetText,
  withGetAddr,
  withSetAddr,
  withGetContentHash,
  withSetContentHash,
  withQuery,
} from './handlers'
import { TypeORMRepository } from './repositories/typeorm'
import { NewServer } from './server'
import { Signer } from './signer'

config({
  path: process.env.ENV_FILE || './env',
})

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('Database URL is required')
  }

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new TypeORMRepository(dbclient)

  const privateKey = process.env.GATEWAY_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('GATEWAY_PRIVATE_KEY is required')
  }

  const signer = new Signer(privateKey as Hex)

  const app = NewServer(
    withSetText(repo),
    withGetText(signer, repo),
    withSetAddr(repo),
    withGetAddr(signer, repo),
    withSetContentHash(repo),
    withGetContentHash(signer, repo),
    withQuery(), // required for Viem integration
  ).makeApp('/')

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
