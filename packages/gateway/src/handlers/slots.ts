import * as ccip from '@blockful/ccip-server'
import {
  Hash,
  concat,
  encodePacked,
  keccak256,
  pad,
  slice,
  toBytes,
  zeroAddress,
} from 'viem'
import { IProofService, ProvableBlock } from '../interfaces'

const OP_CONSTANT = 0x00
const OP_BACKREF = 0x20

interface StorageElement {
  slots: bigint[]
  value: () => Promise<Hash>
  isDynamic: boolean
}

function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined
  return () => {
    if (!promise) {
      promise = fn()
    }
    return promise
  }
}

export function withGetStorageSlot<T extends ProvableBlock>(
  proofService: IProofService<T>,
): ccip.HandlerDescription {
  return {
    type: 'getStorageSlots(address addr, bytes32[] memory commands, bytes[] memory) external view returns (bytes memory witness)',
    func: async ([addr, commands, constants]) => {
      if (addr === zeroAddress) {
        return { error: { message: 'Invalid address', status: 400 } }
      }
      const proofs = await createProofs(addr, commands, constants, proofService)
      return { data: [proofs] }
    },
  }
}

/**
 *
 * @param address The address to fetch storage slot proofs for
 * @param paths Each element of this array specifies a Solidity-style path derivation for a storage slot ID.
 *              See README.md for details of the encoding.
 */
async function createProofs<T extends ProvableBlock>(
  address: Hash,
  commands: string[],
  constants: Hash[],
  proofService: IProofService<T>,
): Promise<string> {
  const block = await proofService.getProvableBlock()
  const requests: Promise<StorageElement>[] = []
  // For each request, spawn a promise to compute the set of slots required
  for (let i = 0; i < commands.length; i++) {
    requests.push(
      getValueFromPath(
        block,
        address,
        commands[i],
        constants,
        requests.slice(),
        proofService,
      ),
    )
  }
  // Resolve all the outstanding requests
  const results = await Promise.all(requests)
  const slots = Array.prototype.concat(...results.map((result) => result.slots))

  return proofService.getProofs(block, address, slots)
}

async function executeOperation(
  operation: number,
  constants: Hash[],
  requests: Promise<StorageElement>[],
): Promise<Hash> {
  const opcode = operation & 0xe0
  const operand = operation & 0x1f

  switch (opcode) {
    case OP_CONSTANT:
      return constants[operand]
    case OP_BACKREF:
      return await (await requests[operand]).value()
    default:
      throw new Error('Unrecognized opcode')
  }
}

async function computeFirstSlot(
  command: string,
  constants: Hash[],
  requests: Promise<StorageElement>[],
): Promise<{ slot: bigint; isDynamic: boolean }> {
  const commandWord = toBytes(command)
  const flags = commandWord[0]
  const isDynamic = (flags & 0x01) !== 0

  let slot = BigInt(await executeOperation(commandWord[1], constants, requests))

  // If there are multiple path elements, recursively hash them solidity-style to get the final slot.
  for (let j = 2; j < 32 && commandWord[j] !== 0xff; j++) {
    const index: Hash = await executeOperation(
      commandWord[j],
      constants,
      requests,
    )
    slot = BigInt(keccak256(encodePacked(['bytes', 'uint256'], [index, slot])))
  }

  return { slot, isDynamic }
}

async function getDynamicValue<T extends ProvableBlock>(
  block: T,
  address: Hash,
  slot: bigint,
  proofService: IProofService<T>,
): Promise<StorageElement> {
  const firstValue = toBytes(
    await proofService.getStorageAt(block, address, slot),
  )
  // Decode Solidity dynamic value encoding
  if (firstValue[31] & 0x01) {
    // Long value: first slot is `length * 2 + 1`, following slots are data.
    const len = firstValue.length
    const hashedSlot = BigInt(keccak256(encodePacked(['uint256'], [slot])))
    const slotNumbers = Array(Math.ceil(len / 32))
      .fill(BigInt(hashedSlot))
      .map((i, idx) => i + BigInt(idx))
    return {
      slots: Array.prototype.concat([slot], slotNumbers),
      isDynamic: true,
      value: memoize(async () => {
        const values = await Promise.all(
          slotNumbers.map((slot) =>
            proofService.getStorageAt(block, address, slot),
          ),
        )
        return slice(concat(values), len)
      }),
    }
  } else {
    // Short value: least significant byte is `length * 2`, other bytes are data.
    const len = firstValue[31] / 2
    const textDecoder = new TextDecoder()
    const byteValue = textDecoder.decode(firstValue) as Hash
    return {
      slots: [slot],
      isDynamic: true,
      value: () => Promise.resolve(slice(byteValue, len)),
    }
  }
}

async function getValueFromPath<T extends ProvableBlock>(
  block: T,
  address: Hash,
  command: string,
  constants: Hash[],
  requests: Promise<StorageElement>[],
  proofService: IProofService<T>,
): Promise<StorageElement> {
  const { slot, isDynamic } = await computeFirstSlot(
    command,
    constants,
    requests,
  )

  if (!isDynamic) {
    return {
      slots: [slot],
      isDynamic,
      value: memoize(async () =>
        pad(await proofService.getStorageAt(block, address, slot)),
      ),
    }
  }
  return getDynamicValue(block, address, slot, proofService)
}
