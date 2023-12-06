import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { Request } from 'express'
import { RegisterRequestBody, UpdateProfileRequestBody } from '~/types/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Error'
import { USERS_MESSAGES } from '~/constants/errorMessages'
import RefreshToken from '~/models/schemas/RefeshToken.schema'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'

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

  private signRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
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
}

const usersService = new UsersService()
export default usersService
