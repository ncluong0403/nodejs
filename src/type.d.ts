import { Request } from 'express'
import User from './models/schemas/User.schema'

declare module 'express' {
  // override (insert more property) into interface Request
  interface Request {
    user?: User
    decode_authorization?: TokenPayload
    decode_refresh_token?: TokenPayload
    decode_verify_email_token?: TokenPayload
    decode_forgot_password_token?: TokenPayload
  }
}
