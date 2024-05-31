/* eslint-disable prettier/prettier */
import { IProofService } from '../interfaces'
import { IBlockCache } from './IBlockCache'
import { EVMProofHelper } from './evmproof'
import {
    Address,
    Hash,
    PublicClient,
    HttpTransport,
    Chain,
    parseAbiItem,
    toRlp,
    encodeAbiParameters,
    parseAbiParameters
} from 'viem'
import rollupAbi from './rollupABI'

export interface ArbProvableBlock {
    number: number
    sendRoot: string
    nodeIndex: string
    rlpEncodedBlock: string
}

/**
 * The proofService class can be used to calculate proofs for a given target and slot on the Arbitrum network.
 * It's also capable of proofing long types such as mappings or string by using all included slots in the proof.
 *
 */
export class ArbProofService<chain extends Chain>
    implements IProofService<ArbProvableBlock> {
    private readonly l2Provider: PublicClient<HttpTransport, chain>
    private readonly helper: EVMProofHelper<chain>
    private readonly cache: IBlockCache
    private readonly l1Provider: PublicClient<HttpTransport, chain>
    private readonly rollupAddress: string

    constructor(
        l1Provider: PublicClient<HttpTransport, chain>,
        l2Provider: PublicClient<HttpTransport, chain>,
        l2RollupAddress: string,
        cache: IBlockCache,
    ) {
        this.l2Provider = l2Provider
        this.rollupAddress = l2RollupAddress
        this.l1Provider = l1Provider
        this.helper = new EVMProofHelper(l2Provider)
        this.cache = cache
    }

    async getStorageAt(
        block: ArbProvableBlock,
        address: Address,
        slot: bigint,
    ): Promise<Hash> {
        return this.helper.getStorageAt(
            BigInt(block.number),
            address,
            slot,
        )
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
        slots: bigint[],
    ): Promise<Hash> {
        const proof = await this.helper.getProofs(
            block.number as unknown as bigint,
            address,
            slots,
        )

        return encodeAbiParameters(
            parseAbiParameters([
                '(bytes32 version, bytes32 sendRoot, uint64 nodeIndex, bytes rlpEncodedBlock), (bytes[] stateTrieWitness, bytes[][] storageProofs)'
            ]),
            [
                {
                    version:
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                    sendRoot: block.sendRoot as Hash,
                    nodeIndex: BigInt(block.nodeIndex),
                    rlpEncodedBlock: block.rlpEncodedBlock as Hash,
                }, proof

            ]
        ) as Hash
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
        const nodeIndex = await this.l1Provider.readContract({
            abi: rollupAbi,
            functionName: 'latestNodeCreated',
            address: this.rollupAddress as `0x${string}`,
        })

        const [l2blockRaw, sendRoot] = await this.getL2BlockForNode(
            nodeIndex as bigint,
        )

        const blockarray = [
            l2blockRaw.parentHash,
            l2blockRaw.sha3Uncles,
            l2blockRaw.miner,
            l2blockRaw.stateRoot,
            l2blockRaw.transactionsRoot,
            l2blockRaw.receiptsRoot,
            l2blockRaw.logsBloom,
            this.toBeHex(l2blockRaw.difficulty),
            this.toBeHex(l2blockRaw.number),
            this.toBeHex(l2blockRaw.gasLimit),
            this.toBeHex(l2blockRaw.gasUsed),
            this.toBeHex(l2blockRaw.timestamp),
            l2blockRaw.extraData,
            l2blockRaw.mixHash,
            l2blockRaw.nonce,
            this.toBeHex(l2blockRaw.baseFeePerGas),
        ]

        // Rlp encode the block to pass it as an argument
        const rlpEncodedBlock = toRlp(blockarray as Hash[])

        return {
            rlpEncodedBlock,
            sendRoot,
            nodeIndex: nodeIndex as string,
            number: Number(l2blockRaw.number),
        }
    }

    /**
     * Fetches the corresponding L2 block for a given node index and returns it along with the send root.
     * @param {bigint} nodeIndex - The index of the node for which to fetch the block.
     * @returns {Promise<[Record<string, string>, string]>} A promise that resolves to a tuple containing the fetched block and the send root.
     */
    private async getL2BlockForNode(
        nodeIndex: bigint,
    ): Promise<[Record<string, string>, string]> {
        // We first check if we have the block cached
        const cachedBlock = await this.cache.getBlock(nodeIndex)
        if (cachedBlock) {
            return [cachedBlock.block, cachedBlock.sendRoot]
        }
        const [blockHash, sendRoot] = await this.getBlockHashAndSendRoot();
        const l2blockRaw = await this.l2Provider.getBlock({
            blockHash: blockHash as Hash,
            includeTransactions: false,
        })
        // Cache the block for future use
        await this.cache.setBlock(
            nodeIndex,
            l2blockRaw as unknown as Record<string, string>,
            sendRoot,
        )

        return [l2blockRaw as unknown as Record<string, string>, sendRoot]
    }

    private async getBlockHashAndSendRoot(): Promise<[Hash, Hash]> {
        // Get logs based on the event
        const logs = (
            await this.l1Provider.getLogs({
                address: this.rollupAddress as Hash,
                fromBlock: 0n,
                toBlock: 'latest',
                event: parseAbiItem(
                    'event NodeCreated( uint64, bytes32, bytes32, bytes32, (((bytes32[2],uint64[2]), uint8),((bytes32[2],uint64[2]), uint8), uint64), bytes32, bytes32, uint256)',
                ),
            })
        ).reverse()

        /*
            The data, that is the part of the log that we are looking for, is composed of "0x" + all function's arguments concatenated.
            So, to get the BlockHash, that is arg number 6 in the event call, it is necessary to skip all the 6 variables with the 64 length behind it.
            In the sendRoot case, it will be 7 variables with 64 length behind.
        */
        const blockHashCharIndex = 6 * 64 + 2
        const sendRootCharIndex = 7 * 64 + 2

        const blockHash =
            '0x' + logs[0].data.substring(blockHashCharIndex, blockHashCharIndex + 64)
        const sendRoot =
            '0x' + logs[0].data.substring(sendRootCharIndex, sendRootCharIndex + 64)

        return [blockHash as Hash, sendRoot as Hash]
    }

    /**
     *  Converts %%value%% to a Big Endian hexstring.
    */
    private toBeHex(_value: string): string {
        const value = BigInt(_value)
        let result = value.toString(16);
        if (result.length % 2) { result = "0" + result; }
        return "0x" + result;
    }


}
