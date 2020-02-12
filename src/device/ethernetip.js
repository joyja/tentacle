const { Model } = require(`../database`)
const { Controller, Tag } = require('ethernet-ip')

class EthernetIP extends Model {
  static async initialize(db, pubsub) {
    await EthernetIPSource.initialize(db, pubsub)
    return super.initialize(db, pubsub)
  }
  static _createModel(fields) {
    return super.create(fields)
  }
  constructor(selector, checkExists = true) {
    super(selector, checkExists)
    this.client = new Controller()
  }
  async init() {
    const result = await super.init()
    this._device = result.device
    this._host = result.host
    this._slot = result.slot
    this.connected = false
    this.error = null
  }
  async connect() {
    if (!this.connected) {
      this.error = null
      await this.client.connect(this.host, this.slot).catch((error) => {
        this.error = error.message
      })
      if (!this.error) {
        this.connected = true
      } else {
        this.connected = false
      }
    }
  }
  async disconnect() {
    this.client.destroy()
    this.connected = false
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
  { colName: 'slot', colType: 'INTEGER' }
]
EthernetIP.instances = []
EthernetIP.initialized = false

class EthernetIPSource extends Model {
  static create(ethernetip, tag, tagname) {
    const fields = {
      ethernetip,
      tag,
      tagname
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
      await this.ethernetip.client.readTag(this.tagData)
      await this.tag.setValue(this.tagData.value)
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
  { colName: 'tagname', colType: 'TEXT' }
]
EthernetIPSource.instances = []
EthernetIPSource.initialized = false

module.exports = {
  EthernetIP,
  EthernetIPSource
}
