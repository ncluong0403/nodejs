import { NextFunction, Request, Response } from 'express'
import path from 'path'
import { UPLOAD_DIR } from '~/constants/dir'
import { USERS_MESSAGES } from '~/constants/errorMessages'
import { Media } from '~/constants/interface'
import mediasService from '~/services/medias.services'

export const uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
  const result: Media[] = await mediasService.handleUploadImage(req)
  return res.json({
    result,
    message: USERS_MESSAGES.UPLOAD_SUCCESS
  })
}

export const serveImageController = async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.params
  return res.sendFile(`${UPLOAD_DIR}/${name}.jpg`, (err) => {
    if (err) {
      return res.status((err as any).status).json({
        message: USERS_MESSAGES.IMAGE_NOT_FOUND
      })
    }
  })
}
