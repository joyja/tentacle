const { Model } = require('./database')
const { User } = require('./auth')
const getUnixTime = require('date-fns/getUnixTime')
const fromUnixTime = require('date-fns/fromUnixTime')

class Tag extends Model {
  static async initialize(db, pubsub) {
    ScanClass.initialize(db, pubsub)
    const result = await super.initialize(db, pubsub)
    const newColumns = []
    if (this.tableExisted && this.version === 0) {
      newColumns.push({ colName: 'units', colType: 'TEXT' })
      newColumns.push({ colName: 'max', colType: 'REAL' })
      newColumns.push({ colName: 'min', colType: 'REAL' })
    }
    if (this.tableExisted && this.version < 7) {
      newColumns.push({ colName: 'deadband', colType: 'REAL' })
    }
    for (const column of newColumns) {
      let sql = `ALTER TABLE "${this.table}" ADD "${column.colName}" ${column.colType}`
      await this.executeUpdate(sql)
    }
    return result
  }
  static create(
    name,
    description,
    value,
    scanClass,
    createdBy,
    datatype,
    max,
    min,
    deadband,
    units
  ) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      value,
      scanClass,
      createdBy,
      createdOn,
      datatype,
      max,
      min,
      deadband,
      units,
    }
    return super.create(fields)
  }
  static _deleteModel(selector) {
    return super.delete(selector)
  }
  async init(async) {
    const result = await super.init(async)
    this._name = result.name
    this._description = result.description
    this._value = result.value
    this._datatype = result.datatype
    this._scanClass = result.scanClass
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    this._datatype = result.datatype
    this._max = result.max
    this._min = result.min
    this._units = result.units
    this._deadband = result.deadband
    this.prevValue = null
    this.prevChangeWithinDeadband = false
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
  get value() {
    this.checkInit()
    if (this.datatype === 'INT32') {
      return parseInt(this._value)
    } else {
      return this._value
    }
  }
  async setValue(value, write = true) {
    this.checkInit()
    if (this.source && write) {
      this.source.write(value)
    }
    const result = this.update(this.id, 'value', value, Tag).then((result) => {
      this._value = result
      this.pubsub.publish('tagUpdate', { tagUpdate: this })
    })
    this.prevChangeWithinDeadband =
      this.datatype === 'BOOLEAN'
        ? this.value === this.prevValue
        : Math.abs(this.value - this.prevValue) < this.deadband
    if (!this.prevChangeWithinDeadband) {
      this.prevChangeWithinDeadband = false
      this.prevValue = this.value
    }
    return result
  }
}
Tag.table = `tag`
Tag.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'scanClass', colRef: 'scanClass', onDelete: 'CASCADE' },
  { colName: 'value', colType: 'TEXT' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' },
  { colName: 'datatype', colType: 'TEXT' },
  { colName: 'units', colType: 'TEXT' },
  { colName: 'quality', colType: 'TEXT' },
  { colName: 'max', colType: 'REAL' },
  { colName: 'min', colType: 'REAL' },
  { colName: 'deadband', colType: 'REAL' },
]
Tag.instances = []
Tag.initialized = false

class ScanClass extends Model {
  static async initialize(db, pubsub) {
    const result = await super.initialize(db, pubsub)
    if (this.tableExisted && this.version < 2) {
      const newColumns = [
        { colName: 'name', colType: 'TEXT' },
        { colName: 'description', colType: 'TEXT' },
      ]
      for (const column of newColumns) {
        let sql = `ALTER TABLE "${this.table}" ADD "${column.colName}" ${column.colType}`
        await this.executeUpdate(sql)
      }
    }
    return result
  }
  static create(name, description, rate, createdBy) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      rate,
      createdOn,
      createdBy,
    }
    return super.create(fields)
  }
  async init(async) {
    const result = await super.init(async)
    this._name = result.name
    this._description = result.description
    this._rate = result.rate
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    this.scanCount = 0
  }
  startScan() {
    this.interval = clearInterval(this.interval)
    this.interval = setInterval(async () => {
      await this.scan()
      this.scanCount += 1
    }, this.rate)
  }
  stopScan() {
    if (this.interval) {
      clearInterval(this.interval)
    }
    this.scanCount = 0
  }
  get rate() {
    this.checkInit()
    return this._rate
  }
  setRate(value) {
    return this.update(this.id, 'rate', value, ScanClass).then(
      (result) => (this._rate = result)
    )
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value, ScanClass).then(
      (result) => (this._name = result)
    )
  }
  get description() {
    this.checkInit()
    return this._description
  }
  setDescription(value) {
    return this.update(this.id, 'description', value, ScanClass).then(
      (result) => (this._description = result)
    )
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
}
ScanClass.table = `scanClass`
ScanClass.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'rate', colType: 'INTEGER' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' },
]
ScanClass.instances = []
ScanClass.initialized = false

module.exports = {
  Tag,
  ScanClass,
}
