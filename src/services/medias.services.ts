import { config } from 'dotenv'
import { Request } from 'express'
import path from 'path'
import sharp from 'sharp'
import { isProduction } from '~/constants/config'
import { UPLOAD_DIR } from '~/constants/dir'
import { getNameFromFullName, uploadImage } from '~/utils/file'
import fs from 'fs'
import { MediaType } from '~/constants/enums'
import { Media } from '~/constants/interface'
config()

class MediasService {
  async handleUploadImage(req: Request) {
    const files = await uploadImage(req)
    // console.log('🚀 ~ files:', typeof files)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newNameImage = getNameFromFullName(file.newFilename)
        const newPath = path.resolve(UPLOAD_DIR, `${newNameImage}.jpg`)
        await sharp(file.filepath).jpeg().toFile(newPath)
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
    console.log('result', result)
    return result
  }
}

const mediasService = new MediasService()

export default mediasService
