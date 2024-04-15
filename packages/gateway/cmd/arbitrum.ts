/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'

import {
  withGetAddr,
  withQuery,
  httpCreateAddress,
  httpGetAddress,
  httpCreateText,
  httpGetText,
  withGetText,
} from '../src/handlers'
import { L2Repository } from '../src/repositories/l2'
// import { TypeORMRepository } from '../src/repositories/typeorm'
import { NewServer } from '../src/server'
import { withSigner } from '../src/middlewares'
import { Hex } from 'viem'

config({
  path: process.env.ENV_FILE || './env',
})

// eslint-disable-next-line
const _ = (async () => {
  const privateKey = process.env.PRIVATE_KEY_ARBITRUM

  const repo = new L2Repository(
    'http://127.0.0.1:8547/',
    '0xdfF854d7380Cb5aC8Da05b39F431907F963Bdf4F',
  )
  // const dbclient = await NewDataSource(dbUrl).initialize()
  // const repo = new TypeORMRepository(dbclient)

  const app = NewServer(
    // withSetText(repo),
    withGetText(repo),
    // withSetAddr(repo),
    withGetAddr(repo),
    // withSetContentHash(repo),
    // withGetContentHash(repo),
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
