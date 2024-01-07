import { Request } from 'express'
import formidable, { File } from 'formidable'
import fs from 'fs'
import { filter } from 'lodash'
import path from 'path'
import { UPLOAD_TEMP_DIR } from '~/constants/dir'

export const initFolderUpload = () => {
  if (!fs.existsSync(path.resolve(UPLOAD_TEMP_DIR))) {
    fs.mkdirSync(
      path.resolve(UPLOAD_TEMP_DIR),
      { recursive: true }
      // create folder nested. if recursive is false, it will throw error when path nested ex: uploads/images
    )
  }
}

export const handleUploadSingleImage = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_TEMP_DIR,
    keepExtensions: true,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ name, originalFilename, mimetype }) => {
      console.log({ name, originalFilename, mimetype })
      const valid = Boolean(mimetype?.includes('image'))
      if (!valid) {
        form.emit('error' as any, new Error('File type invalid') as any)
      }

      if (!(name === 'image')) {
        form.emit('error' as any, new Error('Key must be image') as any)
      }

      return valid
    }
  })

  return new Promise<File>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.image) {
        reject(new Error('File is not empty'))
      }
      return resolve((files.image as File[])[0])
    })
  })
}

export const getNameFromFullName = (filename: string) => {
  const name = filename.split('.')
  name.pop()
  return name.join('')
}
