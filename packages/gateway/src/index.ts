/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'

import { NewDataSource } from './datasources/typeorm'
import {
  withGetText,
  withSetText,
  withGetAddr,
  withSetAddr,
  withContentHash,
  withSetContentHash,
} from './handlers'
import { TypeORMRepository } from './repositories/typeorm'
import { NewServer } from './server'

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('Database URL is required')
  }

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new TypeORMRepository(dbclient)

  const app = NewServer(
    withSetText(repo),
    withGetText(repo),
    withGetAddr(repo),
    withSetAddr(repo),
    withContentHash(repo),
    withSetContentHash(repo),
  ).makeApp('/')

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Gateway is running!`)
  })
})()
