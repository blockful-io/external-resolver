import winston from 'winston'
import { decodeFunctionData, parseAbi } from 'viem'
import { RequestHandler, Request, Response, NextFunction } from 'express'

export function withLogger({
  abi,
  debug,
}: {
  abi: string[]
  debug?: boolean
}): RequestHandler {
  const logger = winston.createLogger({
    level: debug ? 'debug' : 'info',
  })

  //
  // If we're not in production then log to the `console` with the format:
  // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
  //
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    )
  }

  return (req: Request, res: Response, next: NextFunction) => {
    let callData = req.body?.data
    if (req.method === 'GET') {
      // fetches de calldata from the url according to the EIP-3668 (/:sender/:calldata.json)
      const data = /\/\w+\/(\w+)\.json/g.exec(req.url) || []
      callData = data.length > 1 ? data[1] : ''
    }
    if (!callData) {
      return next()
    }

    const func = decodeFunctionData({ abi: parseAbi(abi), data: callData })

    next()

    logger.log({
      level: 'info',
      message: JSON.stringify(
        {
          method: req.method,
          function: func.functionName,
          args: func.args,
          status: res.statusCode,
        },
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      ),
    })
  }
}
