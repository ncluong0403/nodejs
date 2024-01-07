import { wrapRequestHandler } from './../utils/handlers'
import { Router } from 'express'
import { uploadSingleImageController } from '~/controllers/medias.controler'

const mediaRouter = Router()

/**
 * Description: Upload single image
 * Path: /upload-single-image
 * Method: POST
 * Body: { code: string }
 */
mediaRouter.post('/upload-single-image', wrapRequestHandler(uploadSingleImageController))

export default mediaRouter
