/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { Hash, createPublicClient, http } from 'viem'
import * as chains from 'viem/chains'
import * as ccip from '@blockful/ccip-server'
import { InMemoryBlockCache } from '../src/services/InMemoryBlockCache'
import { ArbProofService } from '../src/services/ArbProof'
import { withQuery, withGetStorageSlot } from '../src/handlers'
import { abi } from '../src/abi'
import { withLogger } from '../src/middlewares'

config({ path: process.env.ENV_FILE || '../.env' })

function getChain(chainId: number): chains.Chain {
  return (
    Object.values(chains).find((chain) => chain?.id === chainId) ||
    chains.localhost
  )
}

const {
  ROLLUP_ADDRESS: rollupAddr,
  CHAIN_ID: chainId = '31337',
  CHAIN_ID_L2: chainIdL2 = '412346',
  RPC_URL: rpcUrl = 'http://127.0.0.1:8545',
  LAYER2_RPC: rpcUrlL2 = 'http://127.0.0.1:8547',
  DEBUG,
  PORT: port = 3000,
} = process.env

const _ = (async () => {
  if (!rollupAddr) throw new Error('ROLLUP_ADDRESS is required')

  const chain1 = getChain(parseInt(chainId))
  console.debug(`layer 1: ${chain1.name}`)

  const chain2 = getChain(parseInt(chainIdL2))
  console.debug(`layer 2: ${chain2.name}`)

  const provider = createPublicClient({
    chain: chain1,
    transport: http(rpcUrl),
  })
  const providerL2 = createPublicClient({
    chain: chain2,
    transport: http(rpcUrlL2),
  })

  const proofService = new ArbProofService(
    provider,
    providerL2,
    rollupAddr as Hash,
    new InMemoryBlockCache(),
  )

  const server = new ccip.Server()
  server.app.use(withLogger({ abi, debug: DEBUG === 'true' }))

  server.add(abi, withQuery(), withGetStorageSlot(proofService))

  server.makeApp('/').listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
