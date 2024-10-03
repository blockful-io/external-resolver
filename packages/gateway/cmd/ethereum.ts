/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { createPublicClient, http } from 'viem'
import * as ccip from '@blockful/ccip-server'

import { abi } from '../src/abi'
import { L1ProofService } from '../src/services'
import { withLogger } from '../src/middlewares'
import { withQuery, withGetStorageSlot } from '../src/handlers'
import { getChain } from '../src/chain'

config({
  path: process.env.ENV_FILE || '../.env',
})

const {
  CHAIN_ID: chainId = '31337',
  RPC_URL: rpcUrl = 'http://127.0.0.1:8545',
  DEBUG,
  PORT: port = 3000,
} = process.env

// eslint-disable-next-line
const _ = (async () => {
  const chain = getChain(parseInt(chainId))
  if (!chain) throw new Error(`Chain ${chainId} not supported.`)

  const provider = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const server = new ccip.Server()
  server.app.use(withLogger({ abi, debug: DEBUG === 'true' }))

  server.add(abi, withQuery(), withGetStorageSlot(new L1ProofService(provider)))

  server.makeApp('/').listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
