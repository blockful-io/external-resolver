/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
import { IProofService, IBlockCache } from '../types'
import { EVMProofHelper } from './evmproof'
import { Address, Hash, PublicClient, HttpTransport, createPublicClient, Chain, http, parseAbiItem} from 'viem'
import { AbiCoder, EventLog, ethers, toBeHex, toNumber } from 'ethers';
import rollupAbi from "./rollupABI.js";
import * as chains from 'viem/chains'

export interface ArbProvableBlock {
    number: number
    sendRoot: string,
    nodeIndex: string,
    rlpEncodedBlock: string
}


/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Arbitrum network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ArbProofService<chain extends Chain> implements IProofService<ArbProvableBlock> {
    private readonly l2Provider:  PublicClient<HttpTransport, chain>;
    // private readonly rollup: Contract;
    private readonly helper: EVMProofHelper<chain>;
    private readonly cache: IBlockCache;
    private readonly l1Provider: PublicClient<HttpTransport, chain>;
    private readonly address: string;

    constructor(
        l1Provider:  PublicClient<HttpTransport, chain>,
        l2Provider:  PublicClient<HttpTransport, chain>,
        l2RollupAddress: string,
        cache: IBlockCache

    ) {
        this.l2Provider = l2Provider;
        // let rollup = getContract({ 
        //     address: `0x${l2RollupAddress}`,
        //     abi: rollupAbi, 
        //     client: l1Provider, 
        // })

        this.address = l2RollupAddress;
        this.l1Provider = l1Provider;
        this.helper = new EVMProofHelper(l2Provider);
        this.cache = cache
    }

    async getStorageAt(block: ArbProvableBlock, address: Address, slot: bigint): Promise<Hash> {
        return this.helper.getStorageAt(block.number as unknown as bigint, address, slot);
    }


    /**
     * @dev Fetches a set of proofs for the requested state slots.
     * @param block A `ProvableBlock` returned by `getProvableBlock`.
     * @param address The address of the contract to fetch data from.
     * @param slots An array of slots to fetch data for.
     * @returns A proof of the given slots, encoded in a manner that this service's
     *   corresponding decoding library will understand.
     */
    async getProofs(
        block: ArbProvableBlock,
        address: Address,
        slots: bigint[]
    ): Promise<Hash> {
        const proof = await this.helper.getProofs(block.number as unknown as bigint, address, slots);

        return AbiCoder.defaultAbiCoder().encode(
            [
                'tuple(bytes32 version, bytes32 sendRoot, uint64 nodeIndex,bytes rlpEncodedBlock)',
                'tuple(bytes[] stateTrieWitness, bytes[][] storageProofs)',
            ],
            [
                {
                    version:
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                    sendRoot: block.sendRoot,
                    nodeIndex: block.nodeIndex,
                    rlpEncodedBlock: block.rlpEncodedBlock
                },
                proof,
            ]
        ) as Hash;
    }

    /**
    * Retrieves information about the latest provable block in the Arbitrum Rollup.
    *
    * @returns { Promise<ArbProvableBlock> } A promise that resolves to an object containing information about the provable block.
    * @throws Throws an error if any of the underlying operations fail.
    *
    * @typedef { Object } ArbProvableBlock
    * @property { string } rlpEncodedBlock - The RLP - encoded block information.
    * @property { string } sendRoot - The send root of the provable block.
    * @property { string } blockHash - The hash of the provable block.
    * @property { number } nodeIndex - The index of the node corresponding to the provable block.
    * @property { number } number - The block number of the provable block.
    */
    public async getProvableBlock(): Promise<ArbProvableBlock> {
        // Retrieve the latest pending node that has been committed to the rollup.

        // const rollup = getContract({ 
        //     address: `0x${this.address}`,
        //     abi: rollupAbi, 
        //     client: this.l1Provider, 
        // })

        const chainId = parseInt(process.env.CHAIN_ID || '')
        const chain = await this.getChain(Number.isInteger(chainId) ? chainId : 1337)
      
        const client = createPublicClient({
          chain,
          transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
        })
      
           
        const nodeIndex = await client.readContract({
            abi: rollupAbi,
            functionName: 'latestNodeCreated',
            address: `0x${this.address}`
        }) 



        // const nodeIndex = await rollup.latestNodeCreated()
        const [l2blockRaw, sendRoot] = await this.getL2BlockForNode(nodeIndex as bigint)

        const blockarray = [
            l2blockRaw.parentHash,
            l2blockRaw.sha3Uncles,
            l2blockRaw.miner,
            l2blockRaw.stateRoot,
            l2blockRaw.transactionsRoot,
            l2blockRaw.receiptsRoot,
            l2blockRaw.logsBloom,
            toBeHex(l2blockRaw.difficulty),
            toBeHex(l2blockRaw.number),
            toBeHex(l2blockRaw.gasLimit),
            toBeHex(l2blockRaw.gasUsed),
            toBeHex(l2blockRaw.timestamp),
            l2blockRaw.extraData,
            l2blockRaw.mixHash,
            l2blockRaw.nonce,
            toBeHex(l2blockRaw.baseFeePerGas)
        ]

        // Rlp encode the block to pass it as an argument
        const rlpEncodedBlock = ethers.encodeRlp(blockarray)

        return {
            rlpEncodedBlock,
            sendRoot,
            nodeIndex: nodeIndex as string,
            number: toNumber(l2blockRaw.number)
        }
    }

    /**
     * Fetches the corrospending L2 block for a given node index and returns it along with the send root.
     * @param {bigint} nodeIndex - The index of the node for which to fetch the block.
     * @returns {Promise<[Record<string, string>, string]>} A promise that resolves to a tuple containing the fetched block and the send root.
     */
    private async getL2BlockForNode(nodeIndex: bigint): Promise<[Record<string, string>, string]> {

        // We first check if we have the block cached
        const cachedBlock = await this.cache.getBlock(nodeIndex)
        if (cachedBlock) {
            return [cachedBlock.block, cachedBlock.sendRoot]
        }


        const chainId = parseInt(process.env.CHAIN_ID || '')
        const chain = await this.getChain(Number.isInteger(chainId) ? chainId : 1337)
      
        const client = createPublicClient({
            chain,
            transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
        })

        const filter = await client.createEventFilter({ 
            address: `0x${this.address}`,
            event: parseAbiItem('event NodeCreated(uint256)'),
            args: [nodeIndex],
        })
       
        const logs = await client.getFilterLogs({ filter })
        
        console.log("Logs: ", logs)
        const assertion = (logs as unknown as EventLog).args!.assertion
        // Instead of using the AssertionHelper contract we can extract sendRoot from the assertion. Avoiding the deployment of the AssertionHelper contract and an additional RPC call.
        const [blockHash, sendRoot] = assertion[1][0][0]

        const l2blockRaw = await client.getBlock({
            blockHash,
            includeTransactions: false,
        })

        console.log("l2blockRaw: ", l2blockRaw)
  
        // Cache the block for future use
        await this.cache.setBlock(nodeIndex, l2blockRaw as unknown as Record<string, string>, sendRoot)

        return [l2blockRaw as unknown as Record<string, string>, sendRoot]
    }

    private async getChain(chainId: number) {
        for (const chain of Object.values(chains)) {
          if ('id' in chain) {
            if (chain.id === chainId) {
              return chain
            }
          }
        }
      
        throw new Error(`Chain with id ${chainId} not found`)
      }

}