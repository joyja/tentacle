const { Model, executeUpdate } = require(`../database`)
const sparkplug = require(`tentacle-sparkplug-client`)
const getTime = require('date-fns/getTime')
const _ = require('lodash')
const logger = require('../logger')

const createTable = function(db, tableName, fields) {
  let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (`
  sql = `${sql} "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE`
  fields.forEach((field) => {
    if (field.colRef) {
      sql = `${sql}, "${field.colName}" INTEGER`
    } else {
      sql = `${sql}, "${field.colName}" ${field.colType}`
    }
  })
  fields.forEach((field) => {
    if (field.colRef) {
      sql = `${sql}, FOREIGN KEY("${field.colName}") REFERENCES "${field.colRef}"("id") ON DELETE ${field.onDelete}`
    }
  })
  sql = `${sql});`
  return executeUpdate(db, sql)
}

class Mqtt extends Model {
  static async initialize(db, pubsub) {
    await MqttSource.initialize(db, pubsub)
    await MqttPrimaryHost.initialize(db, pubsub)
    const result = await super.initialize(db, pubsub)
    if (this.tableExisted && this.version < 3) {
      const newColumns = [{ colName: 'recordLimit', colType: 'TEXT' }]
      for (const column of newColumns) {
        let sql = `ALTER TABLE "${this.table}" ADD "${column.colName}" ${column.colType}`
        await this.executeUpdate(sql)
      }
    }
    const mqttHistoryFields = [
      { colName: 'mqttSource', colRef: 'mqttSource', onDelete: 'CASCADE' },
      { colName: 'tag', colRef: 'tag', onDelete: 'CASCADE' },
      { colName: 'timestamp', colType: 'INTEGER' },
      { colName: 'value', colType: 'TEXT' }
    ]
    await createTable(this.db, 'mqttHistory', mqttHistoryFields)
    const mqttPrimaryHostHistoryFields = [
      {
        colName: 'mqttPrimaryHost',
        colRef: 'mqttPrimaryHost',
        onDelete: 'CASCADE'
      },
      { colName: 'mqttHistory', colRef: 'mqttHistory', onDelete: 'CASCADE' }
    ]
    await createTable(
      this.db,
      'mqttPrimaryHostHistory',
      mqttPrimaryHostHistoryFields
    )
    return result
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
  async init(async) {
    const result = await super.init(async)
    this._service = result.service
    this._host = result.host
    this._port = result.port
    this._group = result.group
    this._node = result.node
    this._username = result.username
    this._password = result.password
    this._rate = result.rate
    this._encrypt = result.encrypt
    this._recordLimit = result.recordLimit
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
      this.publishHistory()
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
      this.client.publishDeviceData(`${source.device.name}`, {
        timestamp: getTime(new Date()),
        metrics: [...payload]
      })
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
  get recordLimit() {
    this.checkInit()
    return this._recordLimit
  }
  setRecordLimit(value) {
    return this.update(this.id, 'recordLimit', value).then((result) => {
      this._recordLimit = result
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
  { colName: 'primaryHost', colType: 'TEXT' },
  { colName: 'recordLimit', colType: 'INTEGER' }
]
Mqtt.instances = []
Mqtt.initialized = false
Mqtt.connected = false

class MqttSource extends Model {
  static async initialize(db, pubsub) {
    return super.initialize(db, pubsub)
  }
  static create(mqtt, device) {
    const fields = {
      mqtt,
      device
    }
    return super.create(fields)
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

class MqttPrimaryHost extends Model {
  static create(mqtt, name) {
    const fields = {
      mqtt,
      name
    }
    return super.create(fields)
  }
  async init(async = false) {
    const result = await super.init(async)
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
  async getRecordCount() {
    let sql = `SELECT COUNT(id) AS count FROM "mqttPrimaryHostHistory" WHERE mqttPrimaryHost=?`
    const result = await this.constructor.executeQuery(sql, [this.id], true)
    return result.count
  }
  getHistory(limit) {
    let sql = `SELECT 
      a.id as id,  
      a.mqttPrimaryHost as hostId,
      a.mqttPrimaryHost as hostName,
      b.id as historyId,
      b.mqttSource as source,
      b.tag as tag,
      b.timestamp as timestamp,
      b.value as value
      FROM mqttPrimaryHostHistory AS a 
      JOIN mqttHistory AS b 
      ON a.mqttHistory=b.id`
    if (limit) {
      sql = `${sql} LIMIT ${limit}`
    }
    return this.constructor.executeQuery(sql, [])
  }
}
MqttPrimaryHost.table = `mqttPrimaryHost`
MqttPrimaryHost.fields = [
  { colName: 'mqtt', colRef: 'mqtt', onDelete: 'CASCADE' },
  { colName: 'name', colType: 'TEXT' }
]
MqttPrimaryHost.instances = []
MqttPrimaryHost.initialized = false

module.exports = {
  Mqtt,
  MqttSource
}
