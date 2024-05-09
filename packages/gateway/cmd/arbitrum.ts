/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { Hash, createPublicClient, http } from 'viem'
import * as chains from 'viem/chains'
import { InMemoryBlockCache } from '../src/services/InMemoryBlockCache'
import { NewApp } from '../src/app'
import { ArbProofService } from '../src/services/ArbProof'
import { withGetStorageSlot } from '../src/handlers'
const defaultL1Url = 'http://127.0.0.1:8545'
const defaultL2Url = 'http://127.0.0.1:8547'

function getChain() {
  let chain1: chains.Chain = chains.localhost
  let chain2: chains.Chain = chains.localhost
  const chainId = parseInt(process.env.CHAIN_ID || '')
  const chainIdL2 = parseInt(process.env.CHAIN_ID_L2 || '')

  for (const chain of Object.values(chains)) {
    if ('id' in chain) {
      // get l1 chain
      if (chain.id === chainId) {
        chain1 = chain
      }
      // get l2 chain
      else if (chain.id === chainIdL2) {
        chain2 = chain
      }
    }
  }

  return [chain1, chain2]
}

config({
  path: process.env.ENV_FILE || '../env',
})

const _ = (async () => {
  const privateKey = process.env.PRIVATE_KEY
  const rollupAddr = process.env.ROLLUP_ADDRESS
  if (!privateKey || !rollupAddr) {
    throw new Error('PRIVATE_KEY and ROLLUP_ADDRESS are required!')
  }

  const [chain1, chain2] = getChain()
  const provider = createPublicClient({
    chain: chain1,
    transport: http(process.env.RPC_URL || defaultL1Url),
  })
  const providerL2 = createPublicClient({
    chain: chain2,
    transport: http(process.env.LAYER2_RPC || defaultL2Url),
  })

  const proofService = new ArbProofService(
    provider,
    providerL2,
    rollupAddr as Hash,
    new InMemoryBlockCache(),
  )
  const app = NewApp([withGetStorageSlot(proofService)], [])

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
