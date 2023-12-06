import express, { Request, Response, NextFunction } from 'express'
import { body, validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorEntity, ErrorWithStatus } from '~/models/Error'
// can be reused by many routes

// sequential processing, stops running validations chain if the previous one fails.
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req)
    const errors = validationResult(req)
    const errorObj = errors.mapped()
    const entityError = new ErrorEntity({ errors: {} })

    // Nếu biến errors này empty (no err) thì nó sẽ next
    if (errors.isEmpty()) {
      return next()
    }
    for (const key in errorObj) {
      const { msg } = errorObj[key]
      // Different err 422(validate)
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      entityError.errors[key] = errorObj[key]
    }

    next(entityError)
  }
}
