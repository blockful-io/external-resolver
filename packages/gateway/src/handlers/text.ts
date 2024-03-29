import ethers from 'ethers'
import * as ccip from '@chainlink/ccip-read-server'
import { Request as HttpRequest, Response as HttpResponse } from 'express'

import { SetTextProps, GetTextProps, Response } from '../types'

interface WriteRepository {
  setText(params: SetTextProps): Promise<void>
}

export function withSetText(repo: WriteRepository): ccip.HandlerDescription {
  return {
    type: 'setText',
    func: async (args: ethers.utils.Result) => {
      const params: SetTextProps = {
        node: args.node!,
        key: args.key!,
        value: args.value!,
      }

      await repo.setText(params)
      return []
    },
  }
}

interface ReadRepository {
  getText(params: GetTextProps): Promise<Response | undefined>
}

export function withGetText(repo: ReadRepository): ccip.HandlerDescription {
  return {
    type: 'text',
    func: async (args: ethers.utils.Result) => {
      const params: GetTextProps = {
        node: args.node!,
        key: args.key!,
      }
      const text = await repo.getText(params)
      if (!text) return []
      return [text]
    },
  }
}

export function httpCreateText(repo: WriteRepository) {
  return async (req: HttpRequest, res: HttpResponse) => {
    const { node } = req.params
    const { key, value } = req.body

    await repo.setText({
      node,
      key,
      value,
    })

    res.status(201).json({ message: 'ok' })
  }
}

export function httpGetText(repo: ReadRepository) {
  return async (req: HttpRequest, res: HttpResponse) => {
    const { node } = req.params
    const { key } = req.query

    if (!key) {
      return res.status(400).json({ error: 'key is a required query param' })
    }

    const response = await repo.getText({
      node,
      key: key as string,
    })

    res.json(response)
  }
}
