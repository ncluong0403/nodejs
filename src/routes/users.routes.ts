import { Router } from 'express'
import {
  changePasswordController,
  followUserController,
  forgotPasswordController,
  getProfileController,
  getProfileUserController,
  loginController,
  logoutController,
  oAuthController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  unFollowUserController,
  updateProfileController,
  verifyEmailController,
  verifyForgotPasswordController
} from '~/controllers/users.controller'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePassWordValidator,
  emailValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMyProfileValidator,
  userIdValidator,
  verifyEmailTokenValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middlewares'
import { UpdateProfileRequestBody } from '~/models/requests/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'
const usersRouter = Router()

/**
 * Description: Login with google
 * Path: /oauth/google
 * Method: GET
 * Body: { code: string }
 */
usersRouter.get('/oauth/google', oAuthController)

/**
 * Description: Login a user
 * Path: /login
 * Method: POST
 * Body: {  email: string, password: string}
 */
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Description: Refresh token when access token expired
 * Path: /refresh_token
 * Method: POST
 * Body: {refresh_token: string}
 */
usersRouter.post('/refresh_token', refreshTokenValidator, wrapRequestHandler(refreshTokenController))

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
 * Body: { email: string }
 */
usersRouter.post('/resend-verify-email', emailValidator, wrapRequestHandler(resendVerifyEmailController))

/**
 * Description: Submit email to reset password, send email to user
 * Path: /forgot-password
 * Method: POST
 * Body: { email: string }
 */
usersRouter.post('/forgot-password', emailValidator, wrapRequestHandler(forgotPasswordController))

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
 * Body: { forgot-password-token: string, password: string, confirm_password: string }
 */
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController))

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Headers: { Authorization: Bearer <accessToken> }
 */
usersRouter.get('/profile', accessTokenValidator, wrapRequestHandler(getProfileController))

/**
 * Description: Update my profile
 * Path: /me
 * Method: PATCH
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: UserSchema
 */
usersRouter.patch(
  '/update-profile',
  accessTokenValidator,
  updateMyProfileValidator,
  // filterMiddleware dùng để tránh việc client gửi thừa thuộc tính trong body
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
  wrapRequestHandler(updateProfileController)
)

/**
 * Description: Get profile user
 * Path: /:username
 * Method: GET
 */
usersRouter.get('/:username', wrapRequestHandler(getProfileUserController))

/**
 * Description: Follow someone
 * Path: /follow
 * Method: POST
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: { user_id_followed: string}
 */
usersRouter.post('/follow', accessTokenValidator, userIdValidator, wrapRequestHandler(followUserController))

/**
 * Description: UnFollow someone
 * Path: /unfollow/:user_id_followed
 * Method: DELETE
 * Headers: { Authorization: Bearer <accessToken> }
 */
usersRouter.delete(
  '/unfollow/:user_id_followed',
  accessTokenValidator,
  userIdValidator,
  wrapRequestHandler(unFollowUserController)
)

/**
 * Description: Change password
 * Path: /change-password
 * Method: PATCH
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: { old_password: string, pass_word: string, confirm_password: string}
 */
usersRouter.patch(
  '/change-password',
  accessTokenValidator,
  changePassWordValidator,
  wrapRequestHandler(changePasswordController)
)

export default usersRouter
