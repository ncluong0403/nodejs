import { Collection, Db, MongoClient } from 'mongodb'
import { config } from 'dotenv'
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefeshToken.schema'
import Followers from '~/models/schemas/Followers.schema'

// Config ENV
config()

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@twitter.5zr65rw.mongodb.net/?retryWrites=true&w=majority`

class DatabaseService {
  // private -> Just used within class
  private client: MongoClient // Provided by the MongoDB Node.js driver that allows you to interact with a MongoDB database.
  private db: Db // Provided by the MongoDB Node.js driver representing a MongoDB database.

  constructor() {
    this.client = new MongoClient(uri) // This line establishes a connection to MongoDB server
    this.db = this.client.db(process.env.DB_NAME) // This line essentially selects the specified DB within the MongoDB server that client is connected to
  }
  // Function used to connect to db
  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      console.log('Error', error)
      throw error
    }
  }

  // Create getter collection users
  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USER_COLLECTION as string)
  }

  // Create getter collection refreshToken
  get refreshToken(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKEN_COLLECTION as string)
  }

  // Create getter collection followers
  get followers(): Collection<Followers> {
    return this.db.collection(process.env.DB_FOLLOWERS_COLLECTION as string)
  }
}

// Create object from class DatabaseService
const databaseService = new DatabaseService()
export default databaseService
