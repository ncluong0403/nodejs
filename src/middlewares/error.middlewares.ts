import { Request, Response, NextFunction, RequestHandler } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { capitalize, omit } from 'lodash'
import { ErrorWithStatus } from '~/models/Error'
import { JsonWebTokenError } from 'jsonwebtoken'

export const defaultErrorHandler = () => {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ErrorWithStatus) {
      return res.status(err.status).json(omit(err, ['status']))
    }
    // switch err empty to object have properties with message and stack
    // Handle with case obj Error (new Error(message)) -> a special obj
    // https://javascript.info/property-descriptors#object-defineproperties
    Object.getOwnPropertyNames(err).forEach((key) => {
      Object.defineProperty(err, key, { enumerable: true })
    })

    if (err instanceof JsonWebTokenError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: capitalize(err.message)
      })
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: err.message,
      errorInfo: err && err?.errInfo
    })
  }
}
