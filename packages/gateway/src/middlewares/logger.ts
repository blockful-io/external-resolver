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
    const callData =
      req.method === 'GET' ? req.params?.callData : req.body?.data
    const func = decodeFunctionData({ abi: parseAbi(abi), data: callData })

    next()

    logger.log({
      level: 'info',
      message: JSON.stringify({
        method: req.method,
        function: func.functionName,
        args: func.args,
        status: res.statusCode,
      }),
    })
  }
}
