import { promisify } from 'util'
import { config } from 'dotenv'
import { sepolia } from 'viem/chains'
import { addEnsContracts } from '@ensdomains/ensjs'
import { getPrice } from '@ensdomains/ensjs/public'
import {
  Hex,
  createWalletClient,
  encodeFunctionData,
  getChainContractAddress,
  http,
  namehash,
  parseAbiItem,
  publicActions,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { randomSecret } from '@ensdomains/ensjs/utils'
import { sendTransaction } from 'viem/actions'
import { abi } from '@blockful/contracts/out/DatabaseResolver.sol/DatabaseResolver.json'

import { MessageData, DomainData } from '@blockful/gateway/src/types'

import { getRevertErrorData, handleDBStorage } from '../src/client'

config({
  path: process.env.ENV_FILE || '../../../.env',
})

const sleep = promisify(setTimeout)

// eslint-disable-next-line
const _ = (async () => {
  const pvtKey = process.env.PRIVATE_KEY as Hex
  if (!pvtKey) {
    throw new Error('No private key provided')
  }
  const account = privateKeyToAccount(pvtKey)

  const client = createWalletClient({
    chain: addEnsContracts(sepolia),
    transport: http(process.env.RPC_URL),
    account,
  }).extend(publicActions)

  const name = `blockful-${Math.floor(Math.random() * 1000)}`
  const secret = randomSecret()
  const resolverAddress = '0xfCfC138635e8c00BfDa78507C8abeD5013148150' as Hex
  const params = {
    name,
    owner: account.address,
    duration: 31536000n,
    secret,
    resolverAddress,
    data: [],
    reverseRecord: true,
    fuses: 0,
  }

  try {
    const commit = await client.readContract({
      address: getChainContractAddress({
        chain: client.chain,
        contract: 'ensEthRegistrarController',
      }),
      abi: [
        parseAbiItem(
          'function makeCommitment(string calldata name,address owner,uint256 duration,bytes32 secret,address resolver,bytes[] calldata data,bool reverseRecord,uint16 ownerControlledFuses) public returns (bytes32)',
        ),
      ],
      functionName: 'makeCommitment',
      args: [
        params.name,
        params.owner,
        params.duration,
        params.secret,
        params.resolverAddress,
        params.data,
        params.reverseRecord,
        params.fuses,
      ],
    })

    console.log({ commit })

    const commitTx = await sendTransaction(client, {
      to: getChainContractAddress({
        chain: client.chain,
        contract: 'ensEthRegistrarController',
      }),
      data: encodeFunctionData({
        abi: [
          parseAbiItem('function commit(bytes32 commitment) public payable'),
        ],
        functionName: 'commit',
        args: [commit],
      }),
    })

    await client.waitForTransactionReceipt({ hash: commitTx })
    await sleep(60000) // wait for commit to be valid

    const { base, premium } = await getPrice(client, {
      nameOrNames: params.name,
      duration: params.duration,
    })
    const value = ((base + premium) * 110n) / 100n // add 10% to the price for buffer

    const registerTx = await sendTransaction(client, {
      to: getChainContractAddress({
        chain: client.chain,
        contract: 'ensEthRegistrarController',
      }),
      data: encodeFunctionData({
        abi: [
          parseAbiItem(
            'function register(string calldata name,address owner,uint256 duration,bytes32 secret,address resolver,bytes[] calldata data,bool reverseRecord,uint16 ownerControlledFuses) public payable',
          ),
        ],
        functionName: 'register',
        args: [
          params.name,
          params.owner,
          params.duration,
          params.secret,
          params.resolverAddress,
          params.data,
          params.reverseRecord,
          params.fuses,
        ],
      }),
      value,
      gas: 500000n,
    })

    console.log({ registerTx })

    await client.waitForTransactionReceipt({ hash: registerTx })
  } catch (err) {
    console.error({ err })
  }

  try {
    await client.simulateContract({
      functionName: 'setAddr',
      abi,
      args: [
        namehash(`${name}.eth`),
        '0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A0',
      ],
      account: account.address,
      address: resolverAddress,
    })
  } catch (err) {
    const data = getRevertErrorData(err)
    if (data?.errorName === 'StorageHandledByOffChainDatabase') {
      const [domain, url, message] = data.args as [
        DomainData,
        string,
        MessageData,
      ]
      await handleDBStorage({ domain, url, message, signer: account })
    } else {
      console.error('writing failed: ', { err })
    }
  }
})()
