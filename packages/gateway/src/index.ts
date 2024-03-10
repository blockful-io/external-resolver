/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import * as dotenvx from '@dotenvx/dotenvx'

import { NewDataSource } from './datasources/typeorm'
import {
  withGetText,
  withSetText,
  withAddr,
  withSetAddr,
  withContentHash,
  withSetContentHash,
} from './handlers'
import { TypeORMRepository } from './repositories/typeorm'
import { NewServer } from './server'

dotenvx.config()

// eslint-disable-next-line
const _ = (async () => {
  const dbclient = await NewDataSource(process.env.DATABASE_URL).initialize()
  const repo = new TypeORMRepository(dbclient)

  const app = NewServer(
    withSetText(repo),
    withGetText(repo),
    withAddr(repo),
    withSetAddr(repo),
    withContentHash(repo),
    withSetContentHash(repo),
  ).makeApp('/')

  app.listen(process.env.PORT || 3000, () => {
    console.log(`Gateway is running!`)
  })
})()
