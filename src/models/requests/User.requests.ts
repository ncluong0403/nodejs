import { JwtPayload } from 'jsonwebtoken'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ParamsDictionary } from 'express-serve-static-core'

export interface LoginRequestBody {
  email: string
  password: string
}

export interface RegisterRequestBody {
  name: string
  email: string
  password: string
  confirmPassword: string
  date_of_birth: string
}

export interface UpdateProfileRequestBody {
  name?: string
  bio?: string
  date_of_birth?: string
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}

export interface LogoutRequestBody {
  refresh_token: string
}

export interface RefreshTokenRequestBody {
  refresh_token: string
}

export interface FollowUserReqBody {
  followed_user_id: string
}

export interface ChangePasswordReqBody {
  old_password: string
  password: string
  new_password: string
}

export interface EmailVerifyRequestBody {
  email_verify_token: string
}

export interface ResetPasswordRequestBody {
  password: string
}

export interface GetProfileUserReqParam {
  username: string
}

export interface UnFollowReqParam extends ParamsDictionary {
  user_id: string
}

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
  verify: UserVerifyStatus,
  exp: number
  iat: number
}
