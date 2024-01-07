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

export const uploadImage = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_TEMP_DIR,
    keepExtensions: true,
    maxFiles: 4,
    maxFileSize: 20 * 1024 * 1024,
    filter: ({ name, originalFilename, mimetype }) => {
      const valid = Boolean(name === 'image' && mimetype?.includes('image'))
      if (!valid) {
        form.emit('error' as any, new Error('File type invalid or Key must be image') as any)
      }

      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.image) {
        reject(new Error('File is not empty'))
      }
      return resolve(files.image as File[])
    })
  })
}

export const getNameFromFullName = (filename: string) => {
  const name = filename.split('.')
  name.pop()
  return name.join('')
}
