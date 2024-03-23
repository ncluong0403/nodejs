import { config } from 'dotenv'
import jwt, { SignOptions } from 'jsonwebtoken'
import { TokenPayload } from '~/models/requests/User.requests'
// Config ENV
config()

interface signTokenType {
  payload: string | Buffer | object
  privateKey: string
  options?: SignOptions
}

export function signToken({ payload, privateKey, options = { algorithm: 'HS256' } }: signTokenType) {
  return new Promise<string>((resolve, reject) =>
    jwt.sign(payload, privateKey, options, (err, token) => {
      if (err) {
        throw reject(err)
      }
      resolve(token as string)
    })
  )
}

export function verifyToken({ token, privateKey }: { token: string; privateKey: string }) {
  return new Promise<TokenPayload>((resolve, reject) => {
    jwt.verify(token, privateKey, (err, decode) => {
      if (err) {
        throw reject(err)
      }
      resolve(decode as TokenPayload)
    })
  })
}
