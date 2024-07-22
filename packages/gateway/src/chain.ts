import * as chains from 'viem/chains'

export function getChain(chainId: number) {
  return Object.values(chains).find((chain) => chain.id === chainId)
}
