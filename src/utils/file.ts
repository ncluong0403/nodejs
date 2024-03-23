import { Request } from 'express'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'

const dirs = [UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR]

export const initFolderUpload = () => {
  dirs.forEach((dir) => {
    if (!fs.existsSync(path.resolve(dir))) {
      fs.mkdirSync(
        path.resolve(dir),
        { recursive: true }
        // create folder nested. if recursive is false, it will throw error when path nested ex: uploads/images
      )
    }
  })
}

export const handleUploadImage = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_IMAGE_TEMP_DIR,
    keepExtensions: true,
    maxFiles: 4,
    maxFileSize: 500 * 1024, // 500kb
    maxTotalFileSize: 500 * 1024 * 4, // 500kb * 4
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

export const handleUploadVideo = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_VIDEO_DIR,
    maxFiles: 2,
    maxFileSize: 30 * 1024 * 1024, // 30MB
    maxTotalFileSize: 30 * 1024 * 1024 * 2, // 60MB
    filter: ({ name, originalFilename, mimetype }) => {
      const valid = Boolean(name === 'video' && mimetype?.includes('video'))
      if (!valid) {
        form.emit('error' as any, new Error('File type invalid or Key must be video') as any)
      }

      return valid
    }
  })

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!files.video) {
        reject(new Error('File is not empty'))
      }

      const videos = files.video as File[]
      const ext = (files.video as File[]).map((file) => getExtFromFullName(file.originalFilename || ''))
      videos.forEach((video) => {
        fs.renameSync(video.filepath, `${video.filepath}.${ext.join('')}`)
        video.newFilename = `${video.newFilename}.${ext.join('')}`
      })
      return resolve(files.video as File[])
    })
  })
}

export const getNameFromFullName = (filename: string) => {
  const name = filename.split('.')
  name.pop()
  return name.join('')
}

export const getExtFromFullName = (filename: string) => {
  const ext = filename.split('.')

  return ext[ext.length - 1]
}
