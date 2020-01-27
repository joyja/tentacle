const executeQuery = function(db, sql, params) {
  params = typeof params === 'undefined' ? [] : params
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error.message)
      } else {
        resolve(rows)
      }
    })
  }).catch((error) => {
    throw error
  })
}

const executeUpdate = function(db, sql, params) {
  params = typeof params === 'undefined' ? [] : params
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(error) {
      if (error) {
        throw error
      } else {
        resolve(this)
      }
    })
  }).catch((error) => {
    throw error
  })
}

class Model {
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
    return executeUpdate(this.db, sql).catch((error) => {
      throw error
    })
  }
  static async initialize(db, pubsub) {
    this.initialized = true
    this.db = db
    this.pubsub = pubsub
    await this.createTable().catch((error) => {
      throw error
    })
    return this.getAll()
  }
  static checkInitialized() {
    if (!this.initialized) {
      throw Error(
        `you need to run .initialize() before running any methods or accessing properties on a subclass of model.`
      )
    }
  }
  static async get(selector, ignoreExisting = false) {
    this.checkInitialized()
    let model = this.instances.find((instance) => {
      if (!ignoreExisting) {
        if (typeof selector === 'number') {
          return instance.id === selector
        } else {
          throw new Error('Must provide an id (Type of Number) as selector.')
        }
      }
    })
    if (!model) {
      model = new this(selector)
      await model.init(this).catch((error) => {
        throw error
      })
    }
    return model
  }
  static async getAll(sqloverride = false) {
    this.checkInitialized()
    let sql = `SELECT id FROM ${this.table}`
    if (sqloverride) {
      sql = sqloverride
    }
    this.instances = []
    const result = await executeQuery(this.db, sql).catch((error) => {
      throw error
    })
    this.instances = await Promise.all(
      result.map((row) => {
        return this.get(row.id, true).catch((error) => console.error(error))
      })
    )
    return this.instances
  }
  static async create(fields, postquery) {
    this.checkInitialized()
    const sql = `INSERT INTO ${this.table} ("${Object.keys(fields).join(
      `","`
    )}") VALUES (${Array(Object.keys(fields).length)
      .fill(`?`)
      .join(',')})`
    const result = await executeUpdate(
      this.db,
      sql,
      Object.keys(fields).map((key) => fields[key])
    ).catch((error) => {
      throw error
    })
    return this.get(result.lastID, false)
  }
  static async delete(selector) {
    this.checkInitialized()
    const sql = `DELETE FROM ${this.table} WHERE id=?`
    await executeUpdate(this.db, sql, [selector]).catch((error) => {
      throw error
    })
    this.instances = this.instances.filter((instance) => {
      return instance.id !== selector
    })
    return selector
  }
  static findById(id) {
    this.checkInitialized()
    return this.instances.find((instance) => {
      return instance.id === parseInt(id)
    })
  }
  constructor(selector, checkExists = true) {
    const Subclass = this.constructor
    Subclass.checkInitialized()
    this.db = Subclass.db
    this.pubsub = Subclass.pubsub
    this.initialized = false
    if (typeof selector === 'number') {
      this._id = selector
    } else {
      throw new Error('Must provide an id (Type of Number) as selector.')
    }
    if (checkExists) {
      const exists = Subclass.instances.some((instance) => {
        return instance._id === selector
      })
      if (!exists) {
        Subclass.instances.push(this)
      } else {
        throw new Error(
          `A ${Subclass.table} with this id already exists. Use get() method to get the existing instance.`
        )
      }
    }
  }
  async init() {
    const sql = `SELECT * FROM ${this.constructor.table} WHERE id=?`
    let result
    try {
      result = await executeQuery(this.db, sql, [this._id]).catch((error) => {
        throw error
      })
      if (result.length < 1) {
        throw new Error(
          `There is no ${this.constructor.table} with id# ${this._id}.`
        )
      } else {
        this.initialized = true
        this._id = result[0].id
      }
    } catch (error) {
      this.constructor.instances = this.constructor.instances.filter(
        (instance) => {
          return instance._id !== this._id
        }
      )
      throw error
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
    return executeUpdate(this.db, sql, params)
      .then((result) => value)
      .catch((error) => {
        throw error
      })
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
