import User from '~/models/schemas/User.schema'
import databaseService from './database.services'
import { RegisterRequestBody, UpdateProfileRequestBody } from '~/models/requests/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken, verifyToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Error'
import { USERS_MESSAGES } from '~/constants/errorMessages'
import RefreshToken from '~/models/schemas/RefeshToken.schema'
import { ObjectId } from 'mongodb'
import { config } from 'dotenv'
import HTTP_STATUS from '~/constants/httpStatus'
import axios from 'axios'
import { USER } from '~/constants/constant'
import Followers from '~/models/schemas/Followers.schema'

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

  private signAccessTokenAndRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
  }

  private decodeRefreshToken(refresh_token: string) {
    return verifyToken({
      token: refresh_token,
      privateKey: process.env.JWT_REFRESH_TOKEN as string
    })
  }

  async refreshToken({
    refresh_token,
    verify,
    user_id,
    exp
  }: {
    refresh_token: string
    verify: UserVerifyStatus
    user_id: string
    exp: number
  }) {
    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.signAccessToken({ user_id, verify }),
      this.signRefreshToken({ user_id, verify, exp }),
      databaseService.refreshToken.deleteOne({ token: refresh_token })
    ])

    const { iat } = await this.decodeRefreshToken(newRefreshToken)

    await databaseService.refreshToken.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: newRefreshToken,
        iat,
        exp
      })
    )

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    }
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

  async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
    // Make sure the user is authenticated
    if (verify === UserVerifyStatus.Unverified) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.UNAUTHORIZED, message: USERS_MESSAGES.ACCOUNT_NOT_VERIFIED })
    }

    const [accessToken, refreshToken] = await this.signAccessTokenAndRefreshToken({ user_id, verify })

    const { iat, exp } = await this.decodeRefreshToken(refreshToken)

    await databaseService.refreshToken.insertOne(
      new RefreshToken({
        user_id: new ObjectId(user_id),
        token: refreshToken,
        iat,
        exp
      })
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

    // If the user exists, give login
    if (user) {
      const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({
        user_id: user._id.toString(),
        verify: user.verify
      })
      const { iat, exp } = await this.decodeRefreshToken(refresh_token)

      await databaseService.refreshToken.insertOne(
        new RefreshToken({
          user_id: new ObjectId(user._id),
          token: refresh_token,
          iat,
          exp
        })
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

  async register(payload: RegisterRequestBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken({
      user_id: user_id.toString(),
      verify: UserVerifyStatus.Unverified
    })

    // Make sure refresh token & email verify token succeed before inserting user và refresh token into db
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: `user${user_id.toString()}`,
        email_verify_token,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )

    return {
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
    //  new Date() sử dụng để tạo ra giá trị (hiện tại)
    //  $currentDate or "$$NOW" sử dụng khi Mongo cập nhập giá trị (thời điểm mông cập nhập giá trị vào collection)

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

    return {
      message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS
    }
  }

  async resendVerifyEmail(user_id: string) {
    //  new Date() sử dụng để tạo ra giá trị (hiện tại)
    //  $currentDate or "$$NOW" sử dụng khi Mongo cập nhập giá trị

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
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD,
      forgot_password_token
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

  async getProfile(user_id: string) {
    const user = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        // Projection: when set to 0, the field will not be returned. If set to 1, then the field will be returned.
        projection: {
          password: 0,
          forgot_password_token: 0,
          email_verify_token: 0
        }
      }
    )
    return {
      message: USERS_MESSAGES.GET_PROFILE_SUCCESS,
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
          verify: 0,
          createdAt: 0,
          updatedAt: 0
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
          ...(_payload as UpdateProfileRequestBody & { date_of_birth?: Date })
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
        // returnDocument: 'after' dùng để trả về document sau khi update
        returnDocument: 'after'
      }
    )
    return user.value
  }

  async follow(user_id: string, user_id_followed: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      user_id_followed: new ObjectId(user_id_followed)
    })

    // Nếu user này chưa được follow trong db thì mới tiến hành insert
    if (follower === null) {
      await databaseService.followers.insertOne(
        new Followers({
          user_id: new ObjectId(user_id),
          user_id_followed: new ObjectId(user_id_followed)
        })
      )
      return {
        message: USERS_MESSAGES.FOLLOW_SUCCESS
      }
    }
    // Nếu user đã đc follow thì return message followed
    return {
      message: USERS_MESSAGES.FOLLOWED
    }
  }

  async unFollow(user_id: string, user_id_followed: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      user_id_followed: new ObjectId(user_id_followed)
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
      user_id_followed: new ObjectId(user_id_followed)
    })
    return {
      message: USERS_MESSAGES.UNFOLLOW_SUCCESS
    }
  }

  async changePassword(user_id: string, new_password: string) {
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          password: hashPassword(new_password)
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
