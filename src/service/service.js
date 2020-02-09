const { Model } = require(`../database`)
const { Mqtt } = require(`./mqtt`)
const getUnixTime = require('date-fns/getUnixTime')
const fromUnixTime = require('date-fns/fromUnixTime')

class Service extends Model {
  static async initialize(db, pubsub) {
    await Mqtt.initialize(db, pubsub).catch((error) => {
      throw error
    })
    return super.initialize(db, pubsub, Service).catch((error) => {
      throw error
    })
  }
  static create(name, description, type, createdBy) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      type,
      createdBy,
      createdOn
    }
    return super.create(fields)
  }
  static async delete(selector) {
    const deleted = await super.delete(selector)
    await Mqtt.getAll()
    return deleted
  }
  static findById(id) {
    return super.findById(id, Service)
  }
  constructor(selector, checkExists = true) {
    super(selector, Service, checkExists)
  }
  async init() {
    const result = await super.init(Service)
    this._name = result.name
    this._description = result.description
    this._type = result.type
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    if (this._type === `mqtt`) {
      const mqtt = Mqtt.instances.find((instance) => {
        return instance._service === this.id
      })
      this._config = mqtt ? mqtt.id : null
    }
  }
  delete() {
    return super.delete(Service)
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value)
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
    return this.update(this.id, 'description', value)
      .then((result) => (this._description = result))
      .catch((error) => {
        throw error
      })
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
Service.table = `service`
Service.instances = []
Service.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'type', colType: 'TEXT' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' }
]
Service.initialized = false
Service.connected = false

module.exports = {
  Service
}
