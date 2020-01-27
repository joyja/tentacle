const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { executeUpdate, Model } = require('./database')
const uuidv1 = require('uuid/v1')

const APP_SECRET = uuidv1()

class User extends Model {
  static async initialize(db, pubsub) {
    const result = await super.initialize(db, pubsub).catch((error) => {
      throw error
    })
    const rootUser = User.instances.find((user) => {
      return user.username === `admin`
    })
    if (!rootUser) {
      await User.create(`admin`, `password`).catch((error) => {
        throw error
      })
    }
    return result
  }
  static async create(username, password) {
    const hash = await bcrypt.hash(password, 10)
    const fields = {
      username,
      password: hash
    }
    return super.create(fields, User)
  }
  static async login(username, password) {
    const user = User.instances.find((user) => {
      return user.username === username
    })
    const errorMessage = 'The username or password is incorrect.'
    if (user) {
      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        throw new Error(errorMessage)
      } else {
        const token = jwt.sign(
          {
            userId: user.id
          },
          APP_SECRET
        )
        return {
          token,
          user
        }
      }
    } else {
      throw new Error(errorMessage)
    }
  }
  static async getUserFromContext(context) {
    const secret = APP_SECRET
    const errorMessage = `Your are not authorized.`
    const authorization = context.request
      ? context.request.headers.authorization
      : context.connection.context.Authorization
    if (authorization) {
      const token = authorization.replace('Bearer ', '')
      const { userId } = await jwt.verify(token, secret)
      if (userId) {
        return User.get(userId)
      } else {
        throw new Error(errorMessage)
      }
    } else {
      throw new Error(errorMessage)
    }
  }
  static async changePassword(context, oldPassword, newPassword) {
    const user = await User.getUserFromContext(context)
    if (user) {
      const valid = await bcrypt.compare(oldPassword, user.password)
      if (!valid) {
        throw new Error('Invalid old password.')
      } else {
        await user.setPassword(newPassword)
        return user
      }
    } else {
      throw new Error('Please login before trying to change your password.')
    }
  }
  async init() {
    const result = await super.init()
    this._username = result.username
    this._password = result.password
  }
  get username() {
    this.checkInit()
    return this._username
  }
  setUsername(newValue) {
    return this.update(this.id, `username`, newValue)
      .then((result) => {
        this._username = newValue
      })
      .catch((error) => {
        throw error
      })
  }
  get password() {
    this.checkInit()
    return this._password
  }
  async setPassword(newValue) {
    const password = await bcrypt.hash(newValue, 10)
    return this.update(this.id, `password`, password, User)
      .then((result) => {
        this._password = password
      })
      .catch((error) => {
        throw error
      })
  }
}
User.table = `user`
User.fields = [
  { colName: 'username', colType: 'TEXT' },
  { colName: 'password', colType: 'TEXT' }
]
User.instances = []
User.initialized = false

module.exports = {
  User
}
