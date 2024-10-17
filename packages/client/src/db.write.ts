/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Hash,
  Hex,
  createPublicClient,
  encodeFunctionData,
  getChainContractAddress,
  http,
  namehash,
  stringToHex,
  toHex,
} from 'viem'
import { normalize } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'

import { MessageData, DomainData } from '@blockful/gateway/src/types'
import { abi as dbAbi } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { getRevertErrorData, handleDBStorage, getChain } from './client'

config({
  path: process.env.ENV_FILE || '../../../.env',
})

let {
  UNIVERSAL_RESOLVER_ADDRESS: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  PRIVATE_KEY: privateKey,
} = process.env

const chain = getChain(parseInt(chainId))
console.log(`Connecting to ${chain?.name}.`)

const client = createPublicClient({
  chain,
  transport: http(provider),
})

// eslint-disable-next-line
const _ = (async () => {
  const name = normalize('blockful.eth')
  const node = namehash(name)
  const signer = privateKeyToAccount(privateKey as Hex)

  if (!resolver) {
    resolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const data: Hash[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi: dbAbi,
      args: [node, 'com.twitter', '@blockful.eth'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [node, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi: dbAbi,
      args: [node, 1n, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setContenthash',
      abi: dbAbi,
      args: [
        node,
        stringToHex(
          'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450',
        ),
      ],
    }),
  ]

  // REGISTER NEW DOMAIN
  try {
    const resolverAddr = await client.getEnsResolver({
      name,
      universalResolverAddress: resolver as Hex,
    })

    await client.simulateContract({
      functionName: 'register',
      abi: dbAbi,
      args: [toHex(name), 300, signer.address, data],
      account: signer.address,
      address: resolverAddr,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleDBStorage({ domain, url, message, signer })
    } else {
      console.error('writing failed: ', { err })
    }
  }
})()
