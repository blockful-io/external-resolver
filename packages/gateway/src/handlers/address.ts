import * as ccip from '@blockful/ccip-server'
import { Request as HttpRequest, Response as HttpResponse } from 'express'

import { GetAddressProps, Response, SetAddressProps } from '../types'

interface WriteRepository {
  setAddr(params: SetAddressProps): Promise<void>
}

export function withSetAddr(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setAddr',
    func: async (args) => {
      const params: SetAddressProps = {
        node: args.node,
        coin: args.coin,
        addr: args.addr,
      }
      if (params.coin === undefined) params.coin = 60 // default: ether
      await repo.setAddr(params)
      return { data: [] }
    },
  }
}

interface ReadRepository {
  getAddr(params: GetAddressProps): Promise<Response | undefined>
}

export function withGetAddr(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'addr',
    func: async (args): Promise<ccip.HandlerResponse> => {
      const params: GetAddressProps = {
        node: args.node,
        coin: args.coin,
      }
      if (params.coin === undefined) params.coin = 60 // default: ether
      const addr = await repo.getAddr(params)
      if (!addr) return { data: [] }
      return { data: [addr.value], extraData: addr.ttl }
    },
  }
}

export function httpCreateAddress(repo: WriteRepository) {
  return async (req: HttpRequest, res: HttpResponse) => {
    const { node } = req.params
    const { address, coin = 60 } = req.body

    await repo.setAddr({
      node,
      coin,
      addr: address,
    })

    res.status(201).json({ message: 'ok' })
  }
}

export function httpGetAddress(repo: ReadRepository) {
  return async (req: HttpRequest, res: HttpResponse) => {
    const { node } = req.params
    const { coin = 60 } = req.query

    const response = await repo.getAddr({
      node,
      coin: parseInt(coin as string),
    })

    res.json(response)
  }
}
