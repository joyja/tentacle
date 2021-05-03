const logger = require('../logger')

// The global promisified execute query method.
const executeQuery = function (db, sql, params = [], firstRowOnly = false) {
  if (process.env.TENTACLE_DEBUG) {
    console.log(new Date().toISOString())
    console.log(sql)
    console.log(params)
  }
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

// The global promisified execute update method.
const executeUpdate = function (db, sql, params = []) {
  if (process.env.TENTACLE_DEBUG) {
    console.log(new Date().toISOString())
    console.log(sql)
    console.log(params)
  }
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error)
      } else {
        resolve(this)
      }
    })
  })
}

class Model {
  // SQL update method for convenience when you just want to use this model's database connection.
  static executeUpdate(sql, params) {
    return executeUpdate(this.db, sql, params).catch((error) => {
      logger.error(error.message, { message: `sql: ${sql}` })
    })
  }
  // Generic SQL query method for convenience when you just want to use this model's database connection.
  static executeQuery(sql, params, firstRowOnly) {
    return executeQuery(this.db, sql, params, firstRowOnly).catch((error) => {
      logger.error(error, { message: `sql: ${sql}` })
    })
  }
  // Creates the table in the database if it doesn't already exist per the fields property.
  static async createTable() {
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
    const result = await this.executeUpdate(sql)
    for (const field of this.fields) {
      if (field.colRef) {
        sql = `CREATE INDEX IF NOT EXISTS idx_${this.table}_${field.colName} ON ${this.table} (${field.colName});`
        await this.executeUpdate(sql)
      }
    }
    return result
  }
  // Checks the database version, whether the table exists, and sets the appropriate properties so children can react accordingly in their initialize states.
  // This creates the default getters and setters for fields (if they don't already exist on the child constructor)
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
    this.fields.forEach((field) => {
      if (!(field.colName in this.prototype)) {
        Object.defineProperty(this.prototype, field.colName, {
          get() {
            this.checkInit()
            return this[`_${field.colName}`]
          },
        })
      }
      if (
        this.prototype[
          `set${field.colName.charAt(0).toUpperCase() + field.colName.slice(1)}`
        ] === undefined
      ) {
        this.prototype[
          `set${field.colName.charAt(0).toUpperCase() + field.colName.slice(1)}`
        ] = async function (newValue) {
          return this.update(this._id, field.colName, newValue).then(
            (result) => {
              this[`_${field.colName}`] = newValue
              return newValue
            }
          )
        }
      }
    })
    await this.createTable()
    return this.getAll()
  }
  // The prototype needs to be initialized to perform some checks and actions before it is used. We use this to through an error if things aren't done in the right order.
  static checkInitialized() {
    if (!this.initialized) {
      throw Error(
        `you need to run .initialize() before running any methods or accessing properties on a subclass of model.`
      )
    }
  }
  // Looks through instances to see if there are any instances where the criteria key/value pairs match the same key/value pairs in the instance.
  static exists(criteria) {
    return this.instances.some((instance) => {
      return Object.keys(criteria).every((key) => {
        return criteria[key] === instance[key]
      })
    })
  }
  // This retreives instances from memory if there is one loaded with the appropriate ID. If one doesn't exist it will check the database.
  static async get(selector, ignoreExisting = false) {
    this.checkInitialized()
    let model = undefined
    if (typeof selector === 'number') {
      if (!ignoreExisting) {
        model = this.instances.find((instance) => {
          return instance._id === selector
        })
      }
      if (!model) {
        model = new this(selector)
        await model.init()
      }
      return model
    } else {
      logger.error(
        new Error('Must provide an id (Type of Number) as selector.')
      )
    }
  }
  // Clears instances loaded into memory and retrieves all the instances from the database.
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
    this.instances = instances
    return instances
  }
  // Create an instance in the database and load it into memory.
  static async create(fields) {
    this.checkInitialized()
    const sql = `INSERT INTO ${this.table} ("${Object.keys(fields).join(
      `","`
    )}") VALUES (${Array(Object.keys(fields).length).fill(`?`).join(',')})`
    const params = Object.keys(fields).map((key) => fields[key])
    const result = await this.executeUpdate(sql, params)
    return this.get(result.lastID, false)
  }
  // delete an instance from the databse and in memory.
  static async delete(selector) {
    this.checkInitialized()
    const sql = `DELETE FROM ${this.table} WHERE id=?`
    await this.executeUpdate(sql, [selector])
    this.instances = this.instances.filter((instance) => {
      return instance._id !== selector
    })
    return selector
  }
  // retrieves an instance by id from memory.
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
    } else {
      logger.error(
        new Error('Must provide an id (Type of Number) as selector.')
      )
    }
  }
  // initialize the instance: pull the fields from the database and initialize the _fieldName properties.
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
        this.constructor.fields.forEach((field) => {
          this[`_${result[0][field.colName]}`] = result[0][field.colName]
        })
      }
    } catch (error) {
      this.constructor.instances = this.constructor.instances.filter(
        (instance) => {
          return instance._id !== this._id
        }
      )
      this.errors.push(error)
      logger.error(error)
    }
    return result[0]
  }
  // Checks if the instance has been initialized. Used to make sure things are setup and accessed in the appopriate order.
  checkInit() {
    if (!this.initialized) {
      throw Error(
        `you need to run .init() before running any methods or accessing properties on this tag instance.`
      )
    }
  }
  // Update a field value in the database and in memory.
  update(selector, field, value) {
    const sql = `UPDATE ${this.constructor.table} SET "${field}"=? WHERE id=?`
    const params = [value, selector]
    return this.constructor.executeUpdate(sql, params).then((result) => value)
  }
  // Delete this instance (using the constructors delete function)
  async delete() {
    await this.constructor.delete(this.id)
    return this
  }
  // The id getter. It just makes sure the models initialized before the field is accessed.
  get id() {
    this.checkInit()
    return this._id
  }
}

module.exports = {
  executeQuery,
  executeUpdate,
  Model,
}
