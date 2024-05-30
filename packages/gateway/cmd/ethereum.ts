/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { createPublicClient, http } from 'viem'
import * as chains from 'viem/chains'
import * as ccip from '@blockful/ccip-server'

import { abi } from '../src/abi'
import { L1ProofService } from '../src/services'
import { withLogger } from '../src/middlewares'
import { withQuery, withGetStorageSlot } from '../src/handlers'

function getChain(chainId: number) {
  for (const chain of Object.values(chains)) {
    if ('id' in chain) {
      if (chain.id === chainId) {
        return chain
      }
    }
  }

  throw new Error(`Chain with id ${chainId} not found`)
}

config({
  path: process.env.ENV_FILE || '../env',
})

// eslint-disable-next-line
const _ = (async () => {
  const chainId = parseInt(process.env.CHAIN_ID || '')
  const chain = getChain(Number.isInteger(chainId) ? chainId : 1337)

  const provider = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
  })

  const server = new ccip.Server()
  server.app.use(withLogger({ abi, debug: process.env.DEBUG === 'true' }))

  server.add(
    abi,
    withQuery(), // required for Universal Resolver integration
    withGetStorageSlot(new L1ProofService(provider)),
  )

  const port = process.env.PORT || 3000
  server.makeApp('/').listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
