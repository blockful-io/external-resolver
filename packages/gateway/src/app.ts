import * as ccip from '@blockful/ccip-server'
import { RequestHandler } from 'express'

import { NewServer } from './server'

export function NewApp(
  handlers: ccip.HandlerDescription[],
  middlewares: RequestHandler[] = [],
) {
  return NewServer(...handlers).makeApp('/', ...middlewares)
}
