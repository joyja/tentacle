const { Model } = require(`../database`)
const sparkplug = require(`sparkplug-client`)
const getUnixTime = require('date-fns/getUnixTime')
const fromUnixTime = require('date-fns/fromUnixTime')

class Mqtt extends Model {
  static async initialize(db, pubsub) {
    await MqttSource.initialize(db, pubsub)
    return super.initialize(db, pubsub)
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
    this.error = null
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
      this.client.on('reconnect', () => {
        this.onReconnect()
      })
      this.client.on('error', () => {
        this.onError()
      })
      this.client.on('offline', () => {
        this.onOffline()
      })
      this.client.on('birth', () => {
        this.onBirth()
      })
      this.client.on('dcmd', (deviceId, payload) => {
        console.log(`${deviceId}: ${payload}`)
      })
      this.client.on('ncmd', (payload) => {
        console.log(`${payload}`)
      })
    }
  }
  onBirth() {
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
            type: source.tag.datatype
          }
        })
      })
    })
    this.startPublishing()
  }
  onReconnect() {
    this.stopPublishing()
    this.startPublishing()
  }
  onError(error) {
    this.error = error.message
    this.stopPublishing()
  }
  onOffline() {
    this.stopPublishing()
  }
  startPublishing() {
    this.interval = setInterval(() => {
      this.publish()
    }, this.rate)
  }
  stopPublishing() {
    clearInterval(this.interval)
  }
  disconnect() {
    if (this.client) {
      this.stopPublishing()
      const payload = {
        timestamp: getUnixTime(new Date(Date.UTC()))
      }
      this.sources.forEach((source) => {
        if (this.testNumber) {
          this.testNumber += this.testNumber
        } else {
          this.testNumber = 1
        }
        this.client.publishDeviceDeath(`${source.device.name}`, payload)
      })
      this.client.stop()
      this.client = undefined
    }
  }
  async publish() {
    for (const source of this.sources) {
      const payload = source.device.config.sources.map((source) => {
        return {
          name: source.tag.name,
          value: source.tag.value,
          type: source.tag.datatype,
          timestamp: getUnixTime(new Date(Date.UTC()))
        }
      })
      const histPayload = source.history
        .filter((record) => record.initialized)
        .map((record) => {
          return {
            name: record.tag.name,
            value: record.value,
            timestamp: record.timestamp,
            type: record.tag.datatype,
            is_historical: true
          }
        })
      this.client.publishDeviceData(`${source.device.name}`, {
        timestamp: getUnixTime(new Date(Date.UTC())),
        metrics: [...payload, ...histPayload]
      })
      for (const record of source.history.filter(
        (record) => record.initialized
      )) {
        await record.delete().catch((error) => console.log(error))
      }
    }
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
  get port() {
    this.checkInit()
    return this._port
  }
  setPort(value) {
    return this.update(this.id, 'port', value).then(
      (result) => (this._port = result)
    )
  }
  get group() {
    this.checkInit()
    return this._group
  }
  setGroup(value) {
    return this.update(this.id, 'group', value).then(
      (result) => (this._group = result)
    )
  }
  get node() {
    this.checkInit()
    return this._node
  }
  setNode(value) {
    return this.update(this.id, 'node', value).then(
      (result) => (this._node = result)
    )
  }
  get username() {
    this.checkInit()
    return this._username
  }
  setUsername(value) {
    return this.update(this.id, 'username', value).then(
      (result) => (this._username = result)
    )
  }
  get password() {
    this.checkInit()
    return this._password
  }
  setPassword(value) {
    return this.update(this.id, 'password', value).then(
      (result) => (this._password = result)
    )
  }
  get rate() {
    this.checkInit()
    return this._rate
  }
  setRate(value) {
    return this.update(this.id, 'rate', value).then(
      (result) => (this._rate = result)
    )
  }
  get encrypt() {
    this.checkInit()
    return Boolean(this._encrypt)
  }
  setEncrypt(value) {
    return this.update(this.id, 'encrypt', value).then((result) => {
      this._encrypt = result
    })
  }
  get connected() {
    this.checkInit()
    if (this.client) {
      return this.client.connected
    } else {
      return false
    }
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
  { colName: 'rate', colType: 'INTEGER' },
  { colName: 'encrypt', colType: 'INTEGER' }
]
Mqtt.instances = []
Mqtt.initialized = false
Mqtt.connected = false

class MqttSource extends Model {
  static async initialize(db, pubsub) {
    await MqttHistory.initialize(db, pubsub)
    return super.initialize(db, pubsub)
  }
  static create(mqtt, device) {
    const fields = {
      mqtt,
      device
    }
    return super.create(fields, MqttSource)
  }
  async init() {
    const result = await super.init()
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

class MqttHistory extends Model {
  static create(mqttSource, tag, value) {
    const timestamp = getUnixTime(new Date())
    const fields = {
      mqttSource,
      tag,
      timestamp,
      value
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._mqttSource = result.mqttSource
    this._tag = result.tag
    this._value = result.value
    this._timestamp = result.timestamp
  }
  get value() {
    this.checkInit()
    return this._value
  }
  get timestamp() {
    this.checkInit()
    return fromUnixTime(this._timestamp)
  }
}
MqttHistory.table = `mqttHistory`
MqttHistory.fields = [
  { colName: 'mqttSource', colRef: 'mqttSource', onDelete: 'CASCADE' },
  { colName: 'tag', colRef: 'tag', onDelete: 'CASCADE' },
  { colName: 'timestamp', colType: 'INTEGER' },
  { colName: 'value', colType: 'TEXT' }
]
MqttHistory.instances = []
MqttHistory.initialized = false

module.exports = {
  Mqtt,
  MqttSource,
  MqttHistory
}
