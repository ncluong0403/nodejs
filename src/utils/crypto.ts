import { createHash } from 'crypto'
import { config } from 'dotenv'

// Config ENV
config()

export function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export function hashPassword(password: string) {
  return sha256(password + process.env.HASH_PASSWORD)
}
