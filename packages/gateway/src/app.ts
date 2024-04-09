import * as ccip from '@blockful/ccip-server'
import { RequestHandler } from 'express'

import { NewServer } from './server'
import { withQuery } from './handlers'

export function NewApp(
  handlers: ccip.HandlerDescription[],
  middlewares: RequestHandler[],
) {
  return NewServer(
    ...handlers,
    withQuery(), // required for Viem integration
  ).makeApp('/', ...middlewares)
}
