import { Request, Response, NextFunction, RequestHandler } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { omit } from 'lodash'
import { ErrorWithStatus } from '~/models/Error'

export const defaultErrorHandler = () => {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log('🚀 ~ err:', err)
    if (err instanceof ErrorWithStatus) {
      return res.status(err.status).json(omit(err, ['status']))
    }
    // switch err empty to object have properties with message and stack
    Object.getOwnPropertyNames(err).forEach((key) => {
      Object.defineProperty(err, key, { enumerable: true })
    })
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: err.message,
      err
    })
  }
}
