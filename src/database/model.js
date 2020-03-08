const logger = require('../logger')

const executeQuery = function(db, sql, params = [], firstRowOnly = false) {
  return new Promise((resolve, reject) => {
    const callback = (error, rows) => {
      if (error) {
        reject(error)
      } else {
        resolve(rows)
      }
    }
    if (firstRowOnly) {
      db.get(sql, params, callback)
    } else {
      db.all(sql, params, callback)
    }
  })
}

const executeUpdate = function(db, sql, params) {
  params = typeof params === 'undefined' ? [] : params
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(error) {
      if (error) {
        reject(error)
      } else {
        resolve(this)
      }
    })
  })
}

class Model {
  static executeUpdate(sql, params) {
    return executeUpdate(this.db, sql, params).catch((error) => {
      logger.error(error)
    })
  }
  static executeQuery(sql, params, firstRowOnly) {
    return executeQuery(this.db, sql, params, firstRowOnly).catch((error) => {
      logger.error(error)
    })
  }
  static createTable() {
    // fields should be formatted { colName, colType } for typical columns
    // fields should be formatted { colName, colRef, onDelete } for foreign key
    this.checkInitialized()
    let sql = `CREATE TABLE IF NOT EXISTS "${this.table}" (`
    sql = `${sql} "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE`
    this.fields.forEach((field) => {
      if (field.colRef) {
        sql = `${sql}, "${field.colName}" INTEGER`
      } else {
        sql = `${sql}, "${field.colName}" ${field.colType}`
      }
    })
    this.fields.forEach((field) => {
      if (field.colRef) {
        sql = `${sql}, FOREIGN KEY("${field.colName}") REFERENCES "${field.colRef}"("id") ON DELETE ${field.onDelete}`
      }
    })
    sql = `${sql});`
    return this.executeUpdate(sql)
  }
  static async initialize(db, pubsub) {
    this.initialized = true
    this.db = db
    this.pubsub = pubsub
    const { user_version } = await this.executeQuery(
      'PRAGMA user_version',
      [],
      true
    )
    this.version = user_version
    let sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    let params = [this.table]
    const result = await this.executeQuery(sql, params, true)
    this.tableExisted = result ? result.name === this.table : false
    await this.createTable()
    return this.getAll()
  }
  static checkInitialized() {
    if (!this.initialized) {
      throw Error(
        `you need to run .initialize() before running any methods or accessing properties on a subclass of model.`
      )
    }
  }
  static async get(selector, ignoreExisting = false, createResults) {
    this.checkInitialized()
    let model = undefined
    if (typeof selector === 'number') {
      if (!this.cold && !ignoreExisting) {
        model = this.instances.find((instance) => {
          return instance._id === selector
        })
      }
      if (!model || this.cold) {
        model = new this(selector)
        model.createResults = createResults
        await model.init(this)
      }
      return model
    } else {
      logger.error(
        new Error('Must provide an id (Type of Number) as selector.')
      )
    }
  }
  static async getAll() {
    this.checkInitialized()
    let sql = `SELECT id FROM ${this.table}`
    this.instances = []
    const result = await this.executeQuery(sql)
    const instances = await Promise.all(
      result.map((row) => {
        return this.get(row.id, true)
      })
    )
    if (!this.cold) {
      this.instances = instances
    }
    return instances
  }
  static async create(fields, postquery) {
    this.checkInitialized()
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        const sql = `INSERT INTO ${this.table} ("${Object.keys(fields).join(
          `","`
        )}") VALUES (${Array(Object.keys(fields).length)
          .fill(`?`)
          .join(',')})`
        const params = Object.keys(fields).map((key) => fields[key])
        const result = await this.executeUpdate(sql, params)
        const createResults = {
          sql,
          params,
          result
        }
        resolve(await this.get(result.lastID, false, createResults))
      })
    })
  }
  static async delete(selector) {
    this.checkInitialized()
    const sql = `DELETE FROM ${this.table} WHERE id=?`
    await this.executeUpdate(sql, [selector])
    this.instances = this.instances.filter((instance) => {
      return instance._id !== selector
    })
    return selector
  }
  static findById(id) {
    this.checkInitialized()
    return this.instances.find((instance) => {
      return instance.id === parseInt(id)
    })
  }
  constructor(selector) {
    const Subclass = this.constructor
    Subclass.checkInitialized()
    this.db = Subclass.db
    this.pubsub = Subclass.pubsub
    this.initialized = false
    this.errors = []
    if (typeof selector === 'number') {
      this._id = selector
      if (!Subclass.cold) {
        const exists = Subclass.instances.some((instance) => {
          return instance._id === selector
        })
        if (!exists) {
          Subclass.instances.push(this)
        } else {
          logger.error(
            new Error(
              `A ${Subclass.table} with this id already exists. Use get() method to get the existing instance.`
            )
          )
        }
      }
    } else {
      logger.error(
        new Error('Must provide an id (Type of Number) as selector.')
      )
    }
  }
  async init() {
    const sql = `SELECT * FROM ${this.constructor.table} WHERE id=?`
    let result
    try {
      result = await this.constructor.executeQuery(sql, [this._id])
      if (result.length < 1) {
        throw new Error(
          `There is no ${this.constructor.table} with id# ${this._id}.`
        )
      } else {
        this.initialized = true
        this._id = result[0].id
      }
    } catch (error) {
      if (!this.constructor.cold) {
        this.constructor.instances = this.constructor.instances.filter(
          (instance) => {
            return instance._id !== this._id
          }
        )
      }
      this.errors.push(error)
      logger.error(error)
    }
    return result[0]
  }
  checkInit() {
    if (!this.initialized) {
      throw Error(
        `you need to run .init() before running any methods or accessing properties on this tag instance.`
      )
    }
  }
  update(selector, field, value) {
    const sql = `UPDATE ${this.constructor.table} SET "${field}"=? WHERE id=?`
    const params = [value, selector]
    return this.constructor.executeUpdate(sql, params).then((result) => value)
  }
  async delete() {
    await this.constructor.delete(this.id)
    return this
  }
  get id() {
    this.checkInit()
    return this._id
  }
}

module.exports = {
  executeQuery,
  executeUpdate,
  Model
}
