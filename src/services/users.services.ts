import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { Request } from 'express'
import { RegisterRequestBody, UpdateProfileRequestBody } from '~/models/requests/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Error'
import { USERS_MESSAGES } from '~/constants/errorMessages'
import RefreshToken from '~/models/schemas/RefeshToken.schema'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'
import HTTP_STATUS from '~/constants/httpStatus'
import axios from 'axios'
import { USER } from '~/constants/constant'

// Config ENV
config()

class UsersService {
  private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        type: TokenType.AccessToken,
        verify
      },
      privateKey: process.env.JWT_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
      }
    })
  }

  private signRefreshToken({ user_id, verify, exp }: { user_id: string; verify: UserVerifyStatus; exp?: number }) {
    if (exp) {
      return signToken({
        payload: {
          user_id,
          type: TokenType.RefreshToken,
          verify,
          exp
        },
        privateKey: process.env.JWT_REFRESH_TOKEN as string
      })
    }

    return signToken({
      payload: {
        user_id,
        type: TokenType.RefreshToken,
        verify
      },
      privateKey: process.env.JWT_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
      }
    })
  }

  private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        type: TokenType.EmailVerifyToken,
        verify
      },
      privateKey: process.env.JWT_VERIFY_EMAIL_TOKEN as string,
      options: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN
      }
    })
  }

  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })
    return data as {
      email_verified: string
      email: string
      name: string
      given_name: string
      family_name: string
      picture: string
      locale: string
    }
  }

  private async getOAuthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    }

    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return data as {
      access_token: string
      id_token: string
      scope: string
      expires_in: number
      refresh_token: string
    }
  }

  private signAccessTokenAndRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
  }

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const [accessToken, refreshToken] = await this.signAccessTokenAndRefreshToken({ user_id, verify })
    await databaseService.refreshToken.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refreshToken as string })
    )
    return {
      accessToken,
      refreshToken
    }
  }

  async oAuth(code: string) {
    const { access_token, id_token } = await this.getOAuthGoogleToken(code)
    const userInfo = await this.getGoogleUserInfo(access_token, id_token)
    if (!userInfo.email_verified) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.GMAIL_NOT_VERIFIED,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const user = await databaseService.users.findOne({ email: userInfo.email })

    // Neu ton tai thi cho login vao
    if (user) {
      const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
        user_id: user._id.toString(),
        verify: user.verify
      })
      await databaseService.refreshToken.insertOne(
        new RefreshToken({ user_id: new ObjectId(user._id), token: refresh_token as string })
      )

      return { access_token, refresh_token, newUser: USER.NOT_NEW_USER, username: user.name, verify: user.verify }
    } else {
      const password = (Math.random() + 1).toString(36).substring(2)
      // Neu email chua ton tai thi tien hanh dang ki moi
      const data = await this.register({
        email: userInfo.email,
        name: userInfo.name,
        date_of_birth: new Date().toISOString(),
        password,
        confirmPassword: password
      })

      return { ...data, newUser: USER.NEW_USER, username: userInfo.name, verify: UserVerifyStatus.Unverified }
    }
  }

  private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return signToken({
      payload: {
        user_id,
        type: TokenType.ForgotPassWordToken,
        verify
      },
      privateKey: process.env.JWT_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN
      }
    })
  }

  async refreshToken({
    refresh_token,
    verify,
    user_id
  }: {
    refresh_token: string
    verify: UserVerifyStatus
    user_id: string
  }) {
    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify }),
      databaseService.refreshToken.deleteOne({ token: refresh_token })
    ])

    console.log('🚀 ~ newRefreshToken:', newRefreshToken)
    await databaseService.refreshToken.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: newRefreshToken
      })
    )

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    }
  }

  async register(payload: RegisterRequestBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: `User${user_id}`,
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )

    const [accessToken, refreshToken] = await this.signAccessTokenAndRefreshToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })
    await databaseService.refreshToken.insertOne(new RefreshToken({ user_id, token: refreshToken }))
    console.log('email_verify_token: ', email_verify_token)
    return {
      accessToken,
      refreshToken,
      email_verify_token
    }
  }

  async checkRegisterExistedEmail(email: string) {
    const isExistedEmail = await databaseService.users.findOne({ email })
    if (isExistedEmail) {
      throw new Error(USERS_MESSAGES.EMAIL_ALREADY_EXISTS)
    }
    return true
  }

  confirmPassword(confirmPassword: string, req: any) {
    if (confirmPassword !== req.body.password) {
      throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
    }
    return true
  }

  async logout(refresh_token: string) {
    await databaseService.refreshToken.deleteOne({ token: refresh_token })
    return {
      message: USERS_MESSAGES.LOGOUT_SUCCESS
    }
  }

  async verifyEmail(user_id: string) {
    // Thời điểm hàm chạy vào được tạo giá trị cập nhập: new Date()
    // Thời điểm MongoDB cập nhập giá trị (sau thời gian tạo giá trị cập nhập bằng new Date) thì sẽ dùng: $currentDate or "$$NOW"

    const [token] = await Promise.all([
      this.signAccessTokenAndRefreshToken({ user_id, verify: UserVerifyStatus.Verified }),
      await databaseService.users.updateOne(
        { _id: new ObjectId(user_id) },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified
          },
          $currentDate: {
            updated_at: true
          }
        }
      )
    ])

    const [accessToken, refreshToken] = token
    await databaseService.refreshToken.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refreshToken })
    )

    return {
      accessToken,
      refreshToken
    }
  }

  async resendVerifyEmail(user_id: string) {
    // Thời điểm hàm chạy vào được tạo giá trị cập nhập: new Date()
    // Thời điểm MongoDB cập nhập giá trị (sau thời gian tạo giá trị cập nhập bằng new Date) thì sẽ dùng: $currentDate or "$$NOW"

    const email_verify_token = await this.signEmailVerifyToken({ user_id, verify: UserVerifyStatus.Unverified })

    // Giả lập chức năng resend verify email
    console.log('Resend verify email: ', email_verify_token)
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    return {
      message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS,
      email_verify_token
    }
  }

  async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })

    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token,
          updated_at: '$$NOW'
        }
      }
    ])
    // Gửi email kèm link đến email user : https://twitter.com/forgot_password?token=token
    console.log('forgot_password_token: ', forgot_password_token)
    return {
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    }
  }

  async resetPassword(user_id: string, password: string) {
    await databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
    return {
      message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
    }
  }

  async getMyProfile(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0
        }
      }
    )
    return {
      message: USERS_MESSAGES.GET_ME_SUCCESS,
      user
    }
  }

  async getProfileUser(username: string) {
    const user = await databaseService.users.findOne(
      { username },
      {
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0,
          verify: 0
        }
      }
    )
    if (user === null) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    return {
      message: USERS_MESSAGES.GET_PROFILE_USER_SUCCESS,
      user
    }
  }

  async updateMyProfile(user_id: string, payload: UpdateProfileRequestBody) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    const user = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          ...(_payload as UpdateProfileRequestBody & { date_of_birth: Date })
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0
        },
        returnDocument: 'after'
      }
    )
    return user.value
  }

  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    // Nếu user này chưa được follow trong db thì mới tiến hành insert
    if (follower === null) {
      await databaseService.followers.insertOne({
        user_id: new ObjectId(user_id),
        followed_user_id: new ObjectId(followed_user_id),
        created_at: new Date()
      })
      return {
        message: USERS_MESSAGES.FOLLOW_SUCCESS
      }
    }
    // Nếu user đã đc follow thì return message followed
    return {
      message: USERS_MESSAGES.FOLLOWED
    }
  }

  async unFollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })

    // Nếu là null thì là k có trong db thì có nghĩa đã unfollow rồi
    if (follower === null) {
      return {
        message: USERS_MESSAGES.ALREADY_UNFOLLOWED
      }
    }
    // Nếu user đã follow thì tiến hành unfollow
    await databaseService.followers.deleteOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    })
    return {
      message: USERS_MESSAGES.UNFOLLOW_SUCCESS
    }
  }

  async changePassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          password: hashPassword(password)
        },
        $currentDate: {
          updated_at: true
        }
      }
    )

    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
    }
  }
}

// Create a new object from instance UsersService
const usersService = new UsersService()
export default usersService
