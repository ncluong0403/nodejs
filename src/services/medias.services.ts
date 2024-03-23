import { config } from 'dotenv'
import { Request } from 'express'
import path from 'path'
import sharp from 'sharp'
import { isProduction } from '~/constants/config'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getNameFromFullName, handleUploadImage, handleUploadVideo } from '~/utils/file'
import fs from 'fs'
import { MediaType } from '~/constants/enums'
import { Media } from '~/constants/interface'
config()

class MediasService {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newNameImage = getNameFromFullName(file.newFilename)
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, `${newNameImage}.jpg`)
        await sharp(file.filepath).jpeg({}).toFile(newPath)
        // delete file in temp folder when upload success
        fs.unlinkSync(file.filepath)

        return {
          url: !isProduction
            ? `${process.env.LOCAL_URL}/static/${newNameImage}.jpg`
            : `${process.env.PRODUCTION_CLIENT_URL}/static/${newNameImage}.jpg`,
          type: MediaType.Image
        }
      })
    )
    return result
  }

  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    const result = files.map((file) => {
      return {
        url: !isProduction
          ? `${process.env.LOCAL_URL}/static/video/${file.newFilename}`
          : `${process.env.PRODUCTION_CLIENT_URL}/static/video/${file.newFilename}`,
        type: MediaType.Video
      }
    })
    return result
  }
}

const mediasService = new MediasService()

export default mediasService
