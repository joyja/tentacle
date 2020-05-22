const { Model } = require(`../database`)
const { Controller, Tag } = require('ethernet-ip')
const logger = require(`../logger`)

class EthernetIP extends Model {
  static async initialize(db, pubsub) {
    await EthernetIPSource.initialize(db, pubsub)
    const result = await super.initialize(db, pubsub)
    if (this.tableExisted && this.version < 6) {
      const newColumns = [
        { colName: 'retryRate', colType: 'INTEGER', default: 5000 },
      ]
      for (const column of newColumns) {
        let sql = `ALTER TABLE "${this.table}" ADD "${column.colName}" ${column.colType}`
        if (column.default) {
          sql = `${sql} DEFAULT ${column.default}`
        }
        await this.executeUpdate(sql)
      }
    }
    return result
  }
  static _createModel(fields) {
    return super.create(fields)
  }
  static async delete(selector) {
    const deleted = super.delete(selector)
    EthernetIPSource.getAll()
    return deleted
  }
  constructor(selector, checkExists = true) {
    super(selector, checkExists)
  }
  async init() {
    const result = await super.init()
    this._device = result.device
    this._host = result.host
    this._slot = result.slot
    this._retryRate = 50000
    this.connected = false
    this.error = null
    this.retryCount = 0
  }
  async connect() {
    if (!this.connected) {
      this.error = null
      logger.info(
        `Connecting to ethernetip device ${this.device.name}, host: ${this.host}, slot: ${this.slot}.`
      )
      if (!this.client) {
        this.client = new Controller()
      }
      await this.client.connect(this.host, this.slot).catch((error) => {
        this.error = error.message
        this.connected = false
        if (!this.retryInterval) {
          this.retryInterval = setInterval(async () => {
            if (this.device) {
              logger.info(
                `Retrying connection to ethernetip device ${this.device.name}, retry attempts: ${this.retryCount}.`
              )
              this.retryCount += 1
              await this.connect()
            } else {
              clearInterval(this.retryInterval)
            }
          }, this.retryRate)
        }
      })
      if (!this.error) {
        this.retryCount = 0
        this.retryInterval = clearInterval(this.retryInterval)
        logger.info(
          `Connected to ethernetip device ${this.device.name}, host: ${this.host}, slot: ${this.slot}.`
        )
        this.connected = true
      } else {
        this.connected = false
        logger.info(
          `Connection failed to ethernetip device ${this.device.name}, host: ${this.host}, slot: ${this.slot}, with error: ${this.error}.`
        )
      }
      this.pubsub.publish('deviceUpdate', {
        deviceUpdate: this.device,
      })
    }
  }
  async disconnect() {
    this.retryCount = 0
    this.retryInterval = clearInterval(this.retryInterval)
    logger.info(`Disconnecting from ethernetip device ${this.device.name}`)
    const logText = `Closed connection to ethernetip device ${this.device.name}`
    this.client.destroy()
    this.client = null
    logger.info(logText)
    this.connected = false
    this.pubsub.publish('deviceUpdate', {
      deviceUpdate: this.device,
    })
  }
  get host() {
    this.checkInit()
    return this._host
  }
  setHost(value) {
    return this.update(this.id, 'host', value).then(
      (result) => (this._host = result)
    )
  }
  get slot() {
    this.checkInit()
    return this._slot
  }
  setSlot(value) {
    return this.update(this.id, 'slot', value).then(
      (result) => (this._slot = result)
    )
  }
  get retryRate() {
    this.checkInit()
    return this._retryRate
  }
  setRetryRate(value) {
    return this.update(this.id, 'retryRate', value).then(
      (result) => (this._retryRate = result)
    )
  }
  get status() {
    if (this.connected) {
      return `connected`
    } else if (this.error) {
      return this.error
    } else {
      return `connecting`
    }
  }
}
EthernetIP.table = `ethernetip`
EthernetIP.fields = [
  { colName: 'device', colRef: 'device', onDelete: 'CASCADE' },
  { colName: 'host', colType: 'TEXT' },
  { colName: 'slot', colType: 'INTEGER' },
  { colName: 'retryRate', colType: 'INTEGER' },
]
EthernetIP.instances = []
EthernetIP.initialized = false

class EthernetIPSource extends Model {
  static create(ethernetip, tag, tagname) {
    const fields = {
      ethernetip,
      tag,
      tagname,
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._ethernetip = result.ethernetip
    this._tag = result.tag
    this._tagname = result.tagname
    this.tagData = new Tag(this._tagname)
  }
  async read() {
    if (this.ethernetip.connected) {
      await this.ethernetip.client.readTag(this.tagData).catch((error) => {
        logger.error(error)
      })
      await this.tag.setValue(this.tagData.value, false)
    }
  }
  async write(value) {
    if (this.ethernetip.connected) {
      await this.ethernetip.client.writeTag(this.tagData, value)
    }
  }
  get tagname() {
    this.checkInit()
    return this._tagname
  }
  setTagname(value) {
    return this.update(this.id, 'tagname', value).then(
      (result) => (this._tagname = result)
    )
  }
}
EthernetIPSource.table = `ethernetipSource`
EthernetIPSource.fields = [
  { colName: 'ethernetip', colRef: 'ethernetip', onDelete: 'CASCADE' },
  { colName: 'tag', colRef: 'tag', onDelete: 'CASCADE' },
  { colName: 'tagname', colType: 'TEXT' },
]
EthernetIPSource.instances = []
EthernetIPSource.initialized = false

module.exports = {
  EthernetIP,
  EthernetIPSource,
}
