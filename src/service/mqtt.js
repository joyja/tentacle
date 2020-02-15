const { Model } = require(`../database`)
const sparkplug = require(`tentacle-sparkplug-client`)
const getTime = require('date-fns/getTime')
const fromUnixTime = require('date-fns/fromUnixTime')
const getMilliseconds = require('date-fns/getMilliseconds')
const parseISO = require('date-fns/parseISO')
const _ = require('lodash')

class Mqtt extends Model {
  static async initialize(db, pubsub) {
    await MqttSource.initialize(db, pubsub)
    await MqttPrimaryHost.initialize(db, pubsub)
    await MqttPrimaryHostHistory.initialize(db, pubsub)
    return super.initialize(db, pubsub)
  }
  static async _createModel(fields) {
    const mqtt = await super.create(_.omit(fields, 'primaryHosts'))
    if (fields.primaryHosts) {
      for (const primaryHost of fields.primaryHosts) {
        await MqttPrimaryHost.create(mqtt.id, primaryHost)
      }
    }
    return mqtt
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
        console.log(deviceId)
        console.log(payload)
      })
      this.client.on('ncmd', (payload) => {
        if (payload.metrics) {
          const rebirth = payload.metrics.find(
            (metric) => metric.name === `Node Control/Rebirth`
          )
          if (rebirth) {
            if (rebirth.value) {
              this.disconnect()
              this.connect()
            }
          }
        }
      })
    }
  }
  onBirth() {
    const payload = {
      timestamp: getTime(new Date()),
      metrics: []
    }
    this.client.publishNodeBirth(payload)
    this.sources.forEach((source) => {
      this.client.publishDeviceBirth(`${source.device.name}`, {
        timestamp: getTime(new Date()),
        metrics: source.device.config.sources.map((source) => {
          return {
            name: source.tag.name,
            value: `${source.tag.value}`,
            type: source.tag.datatype
          }
        })
      })
    })
    MqttPrimaryHost.instances.forEach((host) => {
      if (host.status === `ONLINE` || host.status === `UNKNOWN`) {
        host.readyForData = true
      }
    })
    this.client.on('state', (primaryHostId, state) => {
      if (primaryHostId) {
        const primaryHost = MqttPrimaryHost.instances.find(
          (host) => host.name === primaryHostId
        )
        if (primaryHost) {
          primaryHost.status = `${state}`
          if (`${state}` === `OFFLINE`) {
            primaryHost.readyForData = false
          }
        }
      }
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
        timestamp: getTime(new Date())
      }
      this.sources.forEach((source) => {
        if (this.testNumber) {
          this.testNumber += this.testNumber
        } else {
          this.testNumber = 1
        }
        try {
          this.client.publishDeviceDeath(`${source.device.name}`, payload)
        } catch (error) {
          console.log(source)
        }
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
          timestamp: getTime(new Date())
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
            isHistorical: true
          }
        })
      this.client.publishDeviceData(`${source.device.name}`, {
        timestamp: getTime(new Date()),
        metrics: [...payload, ...histPayload]
      })
      for (const host of this.primaryHosts) {
        if (host.readyForData) {
          for (const record of host.history) {
            await record.delete()
          }
        }
        for (const source of this.sources) {
          for (const record of source.history) {
            if (record.primaryHosts.length === 0) {
              await record.delete()
            }
          }
        }
      }
    }
  }
  get primaryHosts() {
    this.checkInit()
    return MqttPrimaryHost.instances.filter((host) => {
      return host._mqtt === this.id
    })
  }
  async addPrimaryHost(name) {
    return MqttPrimaryHost.create(this.id, name)
  }
  async deletePrimaryHost(name) {
    const primaryHost = MqttPrimaryHost.instances.find((instance) => {
      return instance._mqtt === this.id && instance.name === name
    })
    if (!primaryHost) {
      throw Error(
        `This mqtt service does not have a primary host named ${name}`
      )
    }
    return await primaryHost.delete()
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
  { colName: 'encrypt', colType: 'INTEGER' },
  { colName: 'primaryHost', colType: 'TEXT' }
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
  get recordCount() {
    return MqttHistory.instances.filter((history) => {
      return history._mqttSource === this._id
    }).length
  }
  get history() {
    return MqttHistory.instances.filter((history) => {
      return history._mqttSource === this._id
    })
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
  static async create(mqttSource, tag, value) {
    const timestamp = getTime(new Date())
    const fields = {
      mqttSource,
      tag,
      timestamp,
      value
    }
    const history = await super.create(fields)
    for (const host of history.mqttSource.mqtt.primaryHosts) {
      await MqttPrimaryHostHistory.create(host.id, history.id)
    }
    return history
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
    return new Date(this._timestamp)
  }
  get primaryHosts() {
    return MqttPrimaryHostHistory.instances
      .filter((instance) => {
        return instance._mqttHistory === this._id
      })
      .map((instance) => {
        return MqttPrimaryHost.instances.find((host) => {
          instance._mqttPrimaryHost === host._id
        })
      })
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

class MqttPrimaryHost extends Model {
  static create(mqtt, name) {
    const fields = {
      mqtt,
      name
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._mqtt = result.mqtt
    this._name = result.name
    this.status = `UNKNOWN`
    this.readyForData = false
  }
  get name() {
    this.checkInit()
    return this._name
  }
  get mqtt() {
    this.checkInit()
    return Mqtt.instances.find((instance) => {
      instance.id === this._mqtt
    })
  }
  get recordCount() {
    return MqttPrimaryHostHistory.instances.filter((history) => {
      return history._mqttPrimaryHost === this._id
    }).length
  }
  get history() {
    return MqttPrimaryHostHistory.instances.filter((history) => {
      return history._mqttPrimaryHost === this._id
    })
  }
}
MqttPrimaryHost.table = `mqttPrimaryHost`
MqttPrimaryHost.fields = [
  { colName: 'mqtt', colRef: 'mqtt', onDelete: 'CASCADE' },
  { colName: 'name', colType: 'TEXT' }
]
MqttPrimaryHost.instances = []
MqttPrimaryHost.initialized = false

class MqttPrimaryHostHistory extends Model {
  static create(mqttPrimaryHost, mqttHistory) {
    const fields = {
      mqttPrimaryHost,
      mqttHistory
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._mqttPrimaryHost = result.mqttPrimaryHost
    this._mqttHistory = result.mqttHistory
  }
}
MqttPrimaryHostHistory.table = `mqttPrimaryHostHistory`
MqttPrimaryHostHistory.fields = [
  {
    colName: 'mqttPrimaryHost',
    colRef: 'mqttPrimaryHost',
    onDelete: 'CASCADE'
  },
  { colName: 'mqttHistory', colRef: 'mqttHistory', onDelete: 'CASCADE' }
]
MqttPrimaryHostHistory.instances = []
MqttPrimaryHostHistory.initialized = []

module.exports = {
  Mqtt,
  MqttSource,
  MqttHistory
}
