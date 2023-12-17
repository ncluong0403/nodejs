import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'

const app = express()
const port = 4000

// Middleware
app.use(express.json())
app.use('/users', usersRouter)
// handle Error
app.use(defaultErrorHandler())

// Main route
app.get('/', (req, res, next) => {
  res.send('<h1>Welcome!</h1>')
})

// connect DB from MongoDB server
databaseService.connect()

// Listen port
app.listen(port, () => {
  console.log(`App listening on port ${port}!`)
})
