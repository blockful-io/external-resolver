/**
 * This file purpose is to implement a client capable of calling methods on a given
 * Blockchain Node and to redirect the request to a Gateway whenever necessary.
 */

import { config } from 'dotenv'
import {
  Hex,
  createPublicClient,
  decodeErrorResult,
  encodeFunctionData,
  getChainContractAddress,
  http,
  namehash,
  stringToHex,
  toHex,
  walletActions,
  zeroHash,
} from 'viem'
import { normalize, packetToBytes } from 'viem/ens'
import { privateKeyToAccount } from 'viem/accounts'
import { addEnsContracts } from '@ensdomains/ensjs'

import { abi } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'
import { abi as universalResolverResolveAbi } from '@blockful/contracts/out/UniversalResolver.sol/UniversalResolver.json'
import { abi as scAbi } from '@blockful/contracts/out/SubdomainController.sol/SubdomainController.json'
import { MessageData, DomainData } from '@blockful/gateway/src/types'
import { getRevertErrorData, getChain, handleDBStorage } from './client'

config({
  path: process.env.ENV_FILE || '../.env',
})

let {
  UNIVERSAL_RESOLVER_ADDRESS: universalResolver,
  RESOLVER_ADDRESS: resolver,
  CHAIN_ID: chainId = '31337',
  RPC_URL: provider = 'http://127.0.0.1:8545/',
  L2_RPC_URL: providerL2 = 'http://127.0.0.1:8547',
  PRIVATE_KEY: privateKey,
} = process.env

const chain = getChain(parseInt(chainId))
if (!chain) {
  throw new Error('Chain not found')
}

const client = createPublicClient({
  chain: addEnsContracts(chain),
  transport: http(provider),
}).extend(walletActions)
console.log(`Connecting to ${chain?.name}.`)

// eslint-disable-next-line
const _ = (async () => {
  if (!resolver) {
    throw new Error('RESOLVER_ADDRESS is required')
  }

  if (!universalResolver) {
    universalResolver = getChainContractAddress({
      chain: client.chain,
      contract: 'ensUniversalResolver',
    })
  }

  const name = normalize('meditation.arb.eth')
  const encodedName = toHex(packetToBytes(name))
  const node = namehash(name)
  const signer = privateKeyToAccount(privateKey as Hex)

  const data: Hex[] = [
    encodeFunctionData({
      functionName: 'setText',
      abi,
      args: [node, 'com.twitter', `@${name}`],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi,
      args: [node, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setAddr',
      abi,
      args: [node, 1n, '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0'],
    }),
    encodeFunctionData({
      functionName: 'setContenthash',
      abi,
      args: [
        node,
        stringToHex(
          'ipns://k51qzi5uqu5dgccx524mfjv7znyfsa6g013o6v4yvis9dxnrjbwojc62pt0450',
        ),
      ],
    }),
  ]

  const duration = 31556952000n
  const calldata = {
    functionName: 'register',
    abi: scAbi,
    args: [
      {
        name: encodedName,
        owner: signer.address,
        duration,
        secret: zeroHash,
        resolver,
        data,
        reverseRecord: false,
        fuses: 0,
        extraData: zeroHash,
      },
    ],
    account: signer,
  }

  try {
    await client.readContract({
      address: universalResolver as Hex,
      abi: universalResolverResolveAbi,
      functionName: 'resolve',
      args: [
        encodedName,
        encodeFunctionData({
          functionName: 'getDeferralHandler',
          abi,
          args: [encodeFunctionData(calldata)],
        }),
      ],
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (!data || !data.args || data.args?.length === 0) return

    const [params] = data.args
    const errorResult = decodeErrorResult({
      abi,
      data: params as Hex,
    })
    switch (errorResult?.errorName) {
      case 'StorageHandledByOffChainDatabase': {
        const [domain, url, message] = errorResult.args as [
          DomainData,
          string,
          MessageData,
        ]
        await handleDBStorage({ domain, url, message, signer })
        return
      }
      case 'StorageHandledByL2': {
        const [chainId, contractAddress] = errorResult.args as [
          bigint,
          `0x${string}`,
        ]

        const l2Client = createPublicClient({
          chain: getChain(Number(chainId)),
          transport: http(providerL2),
        }).extend(walletActions)

        // SUBDOMAIN PRICING

        let value = 0n
        if (calldata.functionName === 'register') {
          const registerParams = (await l2Client.readContract({
            address: contractAddress,
            abi: scAbi,
            functionName: 'registerParams',
            args: [encodedName, duration],
          })) as {
            price: bigint
            commitTime: bigint
            extraData: Hex
            available: boolean
            token: Hex
          }
          value = registerParams.price

          if (!registerParams.available) {
            console.log('Domain unavailable')
            return
          }
        }
        try {
          const { request } = await l2Client.simulateContract({
            ...calldata,
            address: contractAddress,
            value,
          })
          await l2Client.writeContract(request)
        } catch (err) {
          console.log('error while trying to make the request: ', { err })
        }
        return
      }
      default:
        console.error('error registering domain: ', { err })
    }
  }
})()
