const { Model } = require('./database')
const { User } = require('./auth')
const getUnixTime = require('date-fns/getUnixTime')
const fromUnixTime = require('date-fns/fromUnixTime')

class Tag extends Model {
  static initialize(db, pubsub) {
    ScanClass.initialize(db, pubsub)
    return super.initialize(db, pubsub)
  }
  static create(name, description, value, scanClass, createdBy, datatype) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      value,
      scanClass,
      createdBy,
      createdOn,
      datatype
    }
    return super.create(fields, Tag)
  }
  async init() {
    const result = await super.init(Tag)
    this._name = result.name
    this._description = result.description
    this._value = result.value
    this._datatype = result.datatype
    this._scanClass = result.scanClass
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    this._datatype = result.datatype
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value, Tag)
      .then((result) => (this._name = result))
      .catch((error) => {
        throw error
      })
  }
  get description() {
    this.checkInit()
    return this._description
  }
  setDescription(value) {
    return this.update(this.id, 'description', value, Tag)
      .then((result) => (this._description = result))
      .catch((error) => {
        throw error
      })
  }
  get value() {
    this.checkInit()
    if (this.datatype === 'INT32') {
      return parseInt(this._value)
    } else {
      return this._value
    }
  }
  setValue(value) {
    this.checkInit()
    return this.update(this.id, 'value', value, Tag)
      .then((result) => (this._value = result))
      .catch((error) => {
        throw error
      })
  }
  get datatype() {
    this.checkInit()
    return this._datatype
  }
  setDatatype(datatype) {
    this.checkInit()
    return this.update(this.id, 'datatype', datatype, Tag)
      .then((result) => (this._value = result))
      .catch((error) => {
        throw error
      })
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
  get datatype() {
    this.checkInit()
    return this._datatype
  }
  setDatatype(datatype) {
    this.checkInit()
    return this.update(this.id, 'datatype', datatype, Tag)
      .then((result) => (this._datatype = result))
      .catch((error) => {
        throw error
      })
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
  { colName: 'datatype', colType: 'TEXT' }
]
Tag.instances = []
Tag.initialized = false

class ScanClass extends Model {
  static create(rate, createdBy) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      rate,
      createdOn,
      createdBy
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init(ScanClass)
    this._rate = result.rate
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    this.scanCount = 0
  }
  async scan() {
    for (const tag of this.tags) {
      if (tag.source) {
        await tag.source.read().catch((error) => {
          throw error
        })
      }
    }
  }
  startScan() {
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
    return this.update(this.id, 'rate', value, ScanClass)
      .then((result) => (this._rate = result))
      .catch((error) => {
        throw error
      })
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
}
ScanClass.table = `scanClass`
ScanClass.fields = [
  { colName: 'rate', colType: 'INTEGER' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' }
]
ScanClass.instances = []
ScanClass.initialized = false

module.exports = {
  Tag,
  ScanClass
}
