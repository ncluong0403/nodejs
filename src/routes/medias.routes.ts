import { uploadImageController, uploadVideoController } from '~/controllers/medias.controller'
import { wrapRequestHandler } from './../utils/handlers'
import { Router } from 'express'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'

const mediaRouter = Router()

/**
 * Description: Upload image
 * Path: /upload-image
 * Method: POST
 * form-data: { image: file }
 */
mediaRouter.post(
  '/upload-images',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(uploadImageController)
)

/**
 * Description: Upload video
 * Path: /upload-videos
 * Method: POST
 * form-data: { video: file }
 */
mediaRouter.post(
  '/upload-videos',
  accessTokenValidator,
  verifiedUserValidator,
  wrapRequestHandler(uploadVideoController)
)

export default mediaRouter
