/**
 * Script for running the server locally exposing the API
 */
import 'reflect-metadata'
import { config } from 'dotenv'
import { Hex, createPublicClient, http } from 'viem'

import * as ccip from '@blockful/ccip-server'

import {
  withGetText,
  withSetText,
  withGetAbi,
  withSetAbi,
  withGetAddr,
  withSetAddr,
  withGetPubkey,
  withSetPubkey,
  withGetAddrByCoin,
  withSetAddrByCoin,
  withGetContentHash,
  withSetContentHash,
  withQuery,
  withRegisterDomain,
  withTransferDomain,
} from '../src/handlers'
import { abi } from '../src/abi'
import { getChain } from '../src/chain'
import { PostgresRepository } from '../src/repositories'
import { withLogger, withSigner } from '../src/middlewares'
import { NewDataSource } from '../src/datasources/postgres'
import {
  OwnershipValidator,
  SignatureRecover,
  EthereumClient,
} from '../src/services'

config({
  path: process.env.ENV_FILE || '../env',
})

// eslint-disable-next-line
const _ = (async () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required')
  }
  const privateKey =
    process.env.GATEWAY_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  const rpcURL = process.env.RPC_URL || 'http://localhost:8545'

  const chainID = process.env.CHAIN_ID || '31337'
  const chain = getChain(parseInt(chainID))
  if (!chain) throw new Error(`invalid chain: ${chainID}`)
  console.log(`Connected to chain: ${chain.name}`)

  const client = createPublicClient({
    chain,
    transport: http(rpcURL),
  })
  const ethClient = new EthereumClient(client, process.env.ENS_REGISTRY) // Registry is optional

  const dbclient = await NewDataSource(dbUrl).initialize()
  const repo = new PostgresRepository(dbclient)

  const signatureRecover = new SignatureRecover()
  const ownershipValidator = new OwnershipValidator(signatureRecover, [
    ethClient,
    repo,
  ])

  const server = new ccip.Server()
  server.app.use(withSigner(privateKey as Hex))
  server.app.use(withLogger({ abi, debug: process.env.DEBUG === 'true' }))

  server.add(
    abi,
    withQuery(), // required for Universal Resolver integration
    withGetText(repo),
    withSetText(repo, ownershipValidator),
    withGetAbi(repo),
    withSetAbi(repo, ownershipValidator),
    withGetPubkey(repo),
    withSetPubkey(repo, ownershipValidator),
    withGetAddr(repo),
    withGetAddrByCoin(repo),
    withSetAddr(repo, ownershipValidator),
    withSetAddrByCoin(repo, ownershipValidator),
    withGetContentHash(repo),
    withSetContentHash(repo, ownershipValidator),
    withRegisterDomain(repo, signatureRecover),
    withTransferDomain(repo, ownershipValidator),
  )

  const port = process.env.PORT || 3000
  server.makeApp('/').listen(port, () => {
    console.log(`Gateway bound to port ${port}.`)
  })
})()
