import { Request, Response } from 'express'
import usersService from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import {
  ChangePasswordReqBody,
  EmailVerifyRequestBody,
  FollowUserReqBody,
  GetProfileUserReqParam,
  LoginRequestBody,
  LogoutRequestBody,
  RefreshTokenRequestBody,
  RegisterRequestBody,
  ResetPasswordRequestBody,
  TokenPayload,
  UnFollowReqParam,
  UpdateProfileRequestBody
} from '~/models/requests/User.requests'
import databaseService from '~/services/database.services'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USERS_MESSAGES } from '~/constants/errorMessages'
import { UserVerifyStatus } from '~/constants/enums'
import { config } from 'dotenv'
import HTTP_STATUS from '~/constants/httpStatus'

config()

export const oAuthController = async (req: Request, res: Response) => {
  const { code } = req.query
  const { access_token, refresh_token, newUser, username, verify } = await usersService.oAuth(code as string)
  const urlRedirect = `${process.env.GOOGLE_CLIENT_URI}?access_token=${access_token}&refresh_token=${refresh_token}&new_user=${newUser}&user_name=${username}&verify=${verify}`
  return res.redirect(urlRedirect)
}

export const loginController = async (req: Request<ParamsDictionary, any, LoginRequestBody>, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  const result = await usersService.login({ user_id: user_id.toString(), verify: user.verify })
  return res.json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  const result = await usersService.register(req.body)
  return res.json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenRequestBody>,
  res: Response
) => {
  const { user_id, verify, exp } = req.decode_refresh_token as TokenPayload
  const { refresh_token } = req.body
  const result = await usersService.refreshToken({ refresh_token, user_id, verify, exp })
  return res.json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutRequestBody>, res: Response) => {
  const { refresh_token } = req.body
  const result = await usersService.logout(refresh_token)
  return res.json(result)
}

export const verifyEmailController = async (
  req: Request<ParamsDictionary, any, EmailVerifyRequestBody>,
  res: Response
) => {
  const { user_id } = req.decode_verify_email_token as TokenPayload
  const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  // Check user existed?
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  // Check email verified?
  if (user.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  const result = await usersService.verifyEmail(user_id)
  return res.json(result)
}

export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  // Check email verified?
  if (user.verify === UserVerifyStatus.Verified) {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }

  const result = await usersService.resendVerifyEmail(user_id.toString())
  return res.json(result)
}

export const forgotPasswordController = async (req: Request, res: Response) => {
  const { _id, verify } = req.user as User
  const result = await usersService.forgotPassword({ user_id: (_id as ObjectId).toString(), verify })
  return res.json(result)
}

export const verifyForgotPasswordController = async (req: Request, res: Response) => {
  return res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordRequestBody>,
  res: Response
) => {
  const { user_id } = req.decode_forgot_password_token as TokenPayload
  const { password } = req.body

  const result = await usersService.resetPassword(user_id, password)
  return res.json(result)
}

export const getProfileController = async (req: Request, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload

  const result = await usersService.getProfile(user_id)
  return res.json(result)
}

export const getProfileUserController = async (req: Request<GetProfileUserReqParam>, res: Response) => {
  const { username } = req.params

  const result = await usersService.getProfileUser(username)
  return res.json(result)
}

export const updateProfileController = async (
  req: Request<ParamsDictionary, any, UpdateProfileRequestBody>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { body } = req
  const user = await usersService.updateMyProfile(user_id, body)

  return res.json({
    message: USERS_MESSAGES.UPDATE_ME_SUCCESS,
    result: user
  })
}

export const followUserController = async (req: Request<ParamsDictionary, any, FollowUserReqBody>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { user_id_followed } = req.body
  const result = await usersService.follow(user_id, user_id_followed)

  return res.json(result)
}

export const unFollowUserController = async (req: Request<UnFollowReqParam>, res: Response) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { user_id_followed } = req.params
  const result = await usersService.unFollow(user_id, user_id_followed)

  return res.json(result)
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayload
  const { password } = req.body
  const result = await usersService.changePassword(user_id, password)

  return res.json(result)
}
