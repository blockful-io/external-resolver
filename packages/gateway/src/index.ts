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
  httpCreateAddress,
  httpGetAddress,
  httpCreateText,
  httpGetText,
} from './handlers'
import { TypeORMRepository } from './repositories/typeorm'
import { NewServer } from './server'
import { withSigner } from './middlewares'

config({
  path: process.env.ENV_FILE || './env',
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
  const repo = new TypeORMRepository(dbclient)

  const app = NewServer(
    withSetText(repo),
    withGetText(repo),
    withSetAddr(repo),
    withGetAddr(repo),
    withSetContentHash(repo),
    withGetContentHash(repo),
    withQuery(), // required for Viem integration
  ).makeApp(
    '/',
    withSigner(privateKey as Hex, [
      'function text(bytes32 node, string key)',
      'function addr(bytes32 node)',
      'function contenthash(bytes32 node)',
    ]),
  )

  app.post(`/addrs/:node`, httpCreateAddress(repo))
  app.get(`/addrs/:node`, httpGetAddress(repo))
  app.post(`/texts/:node`, httpCreateText(repo))
  app.get(`/texts/:node`, httpGetText(repo))

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
