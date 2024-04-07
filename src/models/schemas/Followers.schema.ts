import { ObjectId } from 'mongodb'

interface FollowersType {
  _id?: ObjectId
  user_id_followed: ObjectId
  created_at?: Date
  user_id: ObjectId
}
export default class Followers {
  _id?: ObjectId
  user_id_followed: ObjectId
  created_at: Date
  user_id: ObjectId
  constructor({ _id, user_id_followed, created_at, user_id }: FollowersType) {
    this._id = _id
    this.user_id_followed = user_id_followed
    this.created_at = created_at || new Date()
    this.user_id = user_id
  }
}
