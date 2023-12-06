import { Router } from 'express'
import {
  forgotPasswordController,
  getMyProfileController,
  loginController,
  logoutController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  updateMyProfileController,
  verifyEmailController,
  verifyForgotPasswordController
} from '~/controllers/users.controller'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMyProfileValidator,
  verifiedUserValidator,
  verifyEmailTokenValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middlewares'
import { UpdateProfileRequestBody } from '~/types/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'
const usersRouter = Router()

/**
 * Description: Login a user
 * Path: /login
 * Method: POST
 * Body: {  email: string, password: string}
 */
usersRouter.post('/login', loginValidator, loginController)

/**
 * Description: Logout a user
 * Path: /logout
 * Method: POST
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: { refreshToken: string }
 */
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: { name: string, email: string, password: string, confirm_password: string, date_of_birth: ISO8601 }
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Description: Verify email
 * Path: /verify-email
 * Method: POST
 * Body: { email_verify_token: string }
 */
usersRouter.post('/verify-email', verifyEmailTokenValidator, wrapRequestHandler(verifyEmailController))

/**
 * Description: Resend verify email
 * Path: /resend-verify-email
 * Method: POST
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: {  }
 */
usersRouter.post('/resend-verify-email', accessTokenValidator, wrapRequestHandler(resendVerifyEmailController))

/**
 * Description: Submit email to reset password, send email to user
 * Path: /forgot-password
 * Method: POST
 * Body: { email: string }
 */
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))

/**
 * Description: Verify link in email to reset password
 * Path: /verify-forgot-password
 * Method: POST
 * Body: { forgot-password-token: string }
 */
usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

/**
 * Description: Reset password
 * Path: /reset-password
 * Method: POST
 * Body: { forgot-password-token: string, password: string }
 */
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController))

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Headers: { Authorization: Bearer <accessToken> }
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMyProfileController))

/**
 * Description: Update my profile
 * Path: /me
 * Method: PATCH
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: UserSchema
 */
usersRouter.patch(
  '/me',
  accessTokenValidator,
  verifiedUserValidator,
  updateMyProfileValidator,
  filterMiddleware<UpdateProfileRequestBody>([
    'name',
    'bio',
    'cover_photo',
    'avatar',
    'location',
    'username',
    'website',
    'date_of_birth'
  ]),
  wrapRequestHandler(updateMyProfileController)
)

export default usersRouter
