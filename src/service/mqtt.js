const { Model } = require(`../database`)
const sparkplug = require(`sparkplug-client-jar`)
const getUnixTime = require('date-fns/getUnixTime')

class Mqtt extends Model {
  static async initialize(db, pubsub) {
    await MqttSource.initialize(db, pubsub)
    return super.initialize(db, pubsub, Mqtt)
  }
  static _createModel(fields) {
    return super.create(fields)
  }
  async init() {
    const result = await super.init(Mqtt)
    this._service = result.service
    this._host = result.host
    this._port = result.port
    this._group = result.group
    this._node = result.node
    this._username = result.username
    this._password = result.password
    this._rate = result.rate
    this._encrypt = result.encrypt
  }
  connect() {
    if (!this.client) {
      const config = {
        serverUrl: `${this.encrypt ? 'ssl' : 'tcp'}://${this.host}:${
          this.port
        }`,
        username: this.username,
        password: this.password,
        groupId: this.group,
        edgeNode: this.node,
        clientId: this.node,
        version: 'spBv1.0',
        publishDeath: true
      }
      this.client = sparkplug.newClient(config)
      // TODO: use sparkplug-b client events to set state of client
      // and make it accessible to GraphQL
      // this.client.on('reconnect', function() {
      //   console.log("received 'reconnect' event")
      // })
      // this.client.on('connect', function() {
      //   console.log('mqtt connected')
      // })
      // this.client.on('close', function() {
      //   console.log("received 'close' event")
      // })
      // this.client.on('error', function(error) {
      //   console.log(error)
      // })
      // this.client.on('offline', function() {
      //   console.log("received 'offline' event")
      // })
      this.client.on('birth', () => {
        const payload = {
          timestamp: getUnixTime(new Date()),
          metrics: []
        }
        this.client.publishNodeBirth(payload)
        this.sources.forEach((source) => {
          this.client.publishDeviceBirth(`${source.device.name}`, {
            timestamp: getUnixTime(new Date(Date.UTC())),
            metrics: source.device.config.sources.map((source) => {
              return {
                name: source.tag.name,
                value: `${source.tag.value}`,
                type: 'string'
              }
            })
          })
        })
        this.interval = setInterval(() => {
          this.sources.forEach((source) => {
            this.client.publishDeviceData(`${source.device.name}`, {
              timestamp: getUnixTime(new Date(Date.UTC())),
              metrics: source.device.config.sources.map((source) => {
                return {
                  name: source.tag.name,
                  value: source.tag.value,
                  type: source.tag.datatype
                }
              })
            })
          })
        }, this.rate)
      })
    }
  }
  disconnect() {
    if (this.client) {
      clearInterval(this.interval)
      const payload = {
        timestamp: getUnixTime(new Date(Date.UTC()))
      }
      this.sources.forEach((source) => {
        this.client.publishDeviceDeath(`${source.device.name}`, payload)
      })
      this.client.stop()
      this.client = undefined
    }
  }
  get host() {
    this.checkInit()
    return this._host
  }
  setHost(value) {
    return this.update(this.id, 'host', value)
      .then((result) => (this._host = result))
      .catch((error) => {
        throw error
      })
  }
  get port() {
    this.checkInit()
    return this._port
  }
  setPort(value) {
    return this.update(this.id, 'port', value)
      .then((result) => (this._port = result))
      .catch((error) => {
        throw error
      })
  }
  get group() {
    this.checkInit()
    return this._group
  }
  setGroup(value) {
    return this.update(this.id, 'group', value)
      .then((result) => (this._group = result))
      .catch((error) => {
        throw error
      })
  }
  get node() {
    this.checkInit()
    return this._node
  }
  setNode(value) {
    return this.update(this.id, 'node', value)
      .then((result) => (this._node = result))
      .catch((error) => {
        throw error
      })
  }
  get username() {
    this.checkInit()
    return this._username
  }
  setUsername(value) {
    return this.update(this.id, 'username', value)
      .then((result) => (this._username = result))
      .catch((error) => {
        throw error
      })
  }
  get password() {
    this.checkInit()
    return this._password
  }
  setPassword(value) {
    return this.update(this.id, 'password', value)
      .then((result) => (this._password = result))
      .catch((error) => {
        throw error
      })
  }
  get rate() {
    this.checkInit()
    return this._rate
  }
  setRate(value) {
    return this.update(this.id, 'rate', value)
      .then((result) => (this._rate = result))
      .catch((error) => {
        throw error
      })
  }
  get encrypt() {
    this.checkInit()
    return this._encrypt
  }
  setRate(value) {
    return this.update(this.id, 'encrypt', value, Mqtt)
      .then((result) => (this._encrypt = result))
      .catch((error) => {
        throw error
      })
  }
}
Mqtt.table = `mqtt`
Mqtt.fields = [
  { colName: 'service', colRef: 'service', onDelete: 'CASCADE' },
  { colName: 'host', colType: 'TEXT' },
  { colName: 'port', colType: 'INTEGER' },
  { colName: 'group', colType: 'TEXT' },
  { colName: 'node', colType: 'TEXT' },
  { colName: 'username', colType: 'TEXT' },
  { colName: 'password', colType: 'TEXT' },
  { colName: 'rate', colType: 'INTEGER' }
]
Mqtt.instances = []
Mqtt.initialized = false
Mqtt.connected = false

class MqttSource extends Model {
  static create(mqtt, device) {
    const fields = {
      mqtt,
      device
    }
    return super.create(fields, MqttSource)
  }
  static delete(selector) {
    return super.delete(selector, MqttSource)
  }
  static findById(id) {
    return super.findById(id, MqttSource)
  }
  constructor(selector, checkExists = true) {
    super(selector, MqttSource, checkExists)
  }
  async init() {
    const result = await super.init(MqttSource)
    this._mqtt = result.mqtt
    this._device = result.device
  }
}
MqttSource.table = `mqttSource`
MqttSource.fields = [
  { colName: 'mqtt', colRef: 'mqtt', onDelete: 'CASCADE' },
  { colName: 'device', colRef: 'device', onDelete: 'CASCADE' }
]
MqttSource.instances = []
MqttSource.initialized = false
MqttSource.connected = false

module.exports = {
  Mqtt,
  MqttSource
}
