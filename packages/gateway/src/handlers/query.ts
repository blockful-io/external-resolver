import * as ccip from '@blockful/ccip-server'
import { ccipRequest } from 'viem/utils'
import { Hex } from 'viem'

/**
 * Handler for Universal Resolver's
 * function query(OffchainLookupCallData[] memory data)
 * see docs: https://github.com/ensdomains/ens-contracts/blob/staging/contracts/utils/UniversalResolver.sol#L70
 *
 * @returns array of failures
 * @returns array of responses from the gateway
 */
export function withQuery(): ccip.HandlerDescription {
  return {
    type: 'query',
    func: async (args) => {
      const failures: boolean[] = []
      const responses: Hex[] = []
      for (const [sender, urls, callData] of args.data) {
        try {
          const result = await ccipRequest({ data: callData, sender, urls })
          responses.push(result)
          failures.push(false)
        } catch (err) {
          responses.push('0x0')
          failures.push(true)
        }
      }
      return [failures, responses]
    },
  }
}
