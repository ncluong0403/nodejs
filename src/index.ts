import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
import mediaRouter from './routes/medias.routes'
import { initFolderUpload } from './utils/file'

const app = express()
const port = 4000

// Create folder upload
initFolderUpload()

// Middleware
app.use(express.json())
app.use('/users', usersRouter)
app.use('/medias', mediaRouter)

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
