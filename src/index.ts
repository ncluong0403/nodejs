import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import mediaRouter from './routes/medias.routes'
import { initFolderUpload } from './utils/file'
import { config } from 'dotenv'
import { UPLOAD_DIR } from './constants/dir'
import staticRouter from './routes/static.routes'

config()
const app = express()
const port = 4000

// Create folder upload
initFolderUpload()

// Middleware
app.use(express.json())
// app.use('/static', express.static(UPLOAD_DIR))
app.use('/users', usersRouter)
app.use('/medias', mediaRouter)
app.use('/static', staticRouter)

// handle Error
app.use(defaultErrorHandler())

// Main route
app.get('/', (req, res, next) => {
  res.send('<h1>Welcome to my App!</h1>')
})

// connect DB from MongoDB server
databaseService.connect()

// Listen port
app.listen(port, () => {
  console.log(`App listening on port ${port}!`)
})
