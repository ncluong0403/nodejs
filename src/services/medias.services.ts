import { Request } from 'express'
import path from 'path'
import sharp from 'sharp'
import { UPLOAD_DIR } from '~/constants/dir'
import { getNameFromFullName, handleUploadSingleImage } from '~/utils/file'

class MediasService {
  async handleUploadSingleImage(req: Request) {
    const file = await handleUploadSingleImage(req)
    const newNameImage = getNameFromFullName(file.newFilename)
    const newPath = path.resolve(UPLOAD_DIR, `${newNameImage}.jpg`)
    await sharp(file.filepath).jpeg().toFile(newPath)
    return `localhost:3000/uploads/${newNameImage}.jpg`
  }
}

const mediasService = new MediasService()

export default mediasService
