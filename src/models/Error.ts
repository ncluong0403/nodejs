import { USERS_MESSAGES } from '~/constants/errorMessages'
import HTTP_STATUS from '~/constants/httpStatus'

type ErrorsType = Record<
  string,
  {
    msg: string
    [key: string]: any
  }
>

export class ErrorWithStatus {
  message: string
  status: number
  constructor({ message, status }: { message: string; status: number }) {
    this.message = message
    this.status = status
  }
}

export class ErrorEntity extends ErrorWithStatus {
  errors: ErrorsType
  constructor({ message = USERS_MESSAGES.VALIDATION_ERROR, errors }: { message?: string; errors: ErrorsType }) {
    super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY }) // Because class ErrorEntity extends ErrorWithStatus supper should use along with message and status within supper
    this.errors = errors
  }
}
