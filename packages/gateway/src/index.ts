/**
 * Script for running the server locally exposing the API
 */
import { AppDataSource } from './datasources/typeorm'
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

// eslint-disable-next-line
const _ = (async () => {
  const dbclient = await AppDataSource.initialize()
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
