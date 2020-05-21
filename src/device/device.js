const { Model } = require('../database')
const { Modbus, ModbusSource } = require('./modbus')
const { EthernetIP, EthernetIPSource } = require('./ethernetip')
const getUnixTime = require('date-fns/getUnixTime')
const fromUnixTime = require('date-fns/fromUnixTime')

class Device extends Model {
  static async initialize(db, pubsub) {
    await Modbus.initialize(db, pubsub)
    await EthernetIP.initialize(db, pubsub)
    return super.initialize(db, pubsub, Device)
  }
  static create(name, description, type, createdBy) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      type,
      createdBy,
      createdOn,
    }
    return super.create(fields)
  }
  static async delete(selector) {
    const deleted = await super.delete(selector)
    await ModbusSource.getAll()
    await Modbus.getAll()
    await EthernetIP.getAll()
    return deleted
  }
  async init() {
    const result = await super.init()
    this._name = result.name
    this._description = result.description
    this._type = result.type
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value).then(
      (result) => (this._name = result)
    )
  }
  get description() {
    this.checkInit()
    return this._description
  }
  setDescription(value) {
    return this.update(this.id, 'description', value).then(
      (result) => (this._description = result)
    )
  }
  get type() {
    this.checkInit()
    return this._type
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
}
Device.table = `device`
Device.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'type', colType: 'TEXT' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' },
]
Device.instances = []
Device.initialized = false

module.exports = {
  Device,
}
