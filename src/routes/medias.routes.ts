import { uploadImageController } from '~/controllers/medias.controller'
import { wrapRequestHandler } from './../utils/handlers'
import { Router } from 'express'

const mediaRouter = Router()

/**
 * Description: Upload single image
 * Path: /upload-image
 * Method: POST
 * Body: { code: string }
 */
mediaRouter.post('/upload-image', wrapRequestHandler(uploadImageController))

export default mediaRouter
