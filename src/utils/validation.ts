import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorEntity, ErrorWithStatus } from '~/models/Error'
// can be reused by many routes

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req)
    const errors = validationResult(req)
    const errorObj = errors.mapped()
    const entityError = new ErrorEntity({ errors: {} })

    // if variable errors is empty, then return next request handler function
    if (errors.isEmpty()) {
      return next()
    }

    for (const key in errorObj) {
      const { msg } = errorObj[key]
      // Error not status 422
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }

      // Error with status 422
      entityError.errors[key] = errorObj[key]
    }
    // if variable have errors with status 422, then return next error handler function
    next(entityError)
  }
}
