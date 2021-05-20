const { Tag, ScanClass } = require('./tag')
const {
  Device,
  Opcua,
  OpcuaSource,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
} = require('./device')
const { Service, Mqtt, MqttSource, MqttHistory } = require('./service')
const { User } = require('./auth')
const getUnixTime = require('date-fns/getUnixTime')
const tag = require('./resolvers/Query/tag')

// This file creates properties and defines methods requiring relationships with other models.
// It is defined here to prevent circular dependencies.

// ==============================
//           Tags
// ==============================

ScanClass.prototype.scan = async function () {
  for (const tag of this.tags) {
    if (tag.source) {
      await tag.source.read()
    }
  }
  for (const source of MqttSource.instances) {
    await source.log(this.id)
  }
}

Object.defineProperties(ScanClass.prototype, {
  tags: {
    get() {
      this.checkInit()
      return Tag.instances.filter((instance) => {
        return instance.scanClass.id === this.id
      })
    },
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    },
  },
})

Tag.delete = async function (selector) {
  const deleted = await this._deleteModel(selector)
  await ModbusSource.getAll()
  await EthernetIPSource.getAll()
  return deleted
}

Tag.prototype.setScanClass = async function (id) {
  const scanClass = ScanClass.findById(id)
  if (scanClass) {
    this.scanClass = scanClass
    return this.update(this.id, 'scanClass', scanClass.id, Tag).then(
      (result) => (this._scanClass = result)
    )
  } else {
    throw Error(`Scan Class with ${id} does not exist.`)
  }
}

Object.defineProperties(Tag.prototype, {
  scanClass: {
    get() {
      this.checkInit()
      return ScanClass.findById(this._scanClass)
    },
  },
  source: {
    get() {
      this.checkInit()
      let source = null
      source = ModbusSource.instances.find((instance) => {
        return instance.tag.id === this.id
      })
      if (!source) {
        source = EthernetIPSource.instances.find((instance) => {
          return instance.tag.id === this.id
        })
      }
      if (!source) {
        source = OpcuaSource.instances.find((instance) => {
          return instance.tag.id === this.id
        })
      }
      return source
    },
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    },
  },
})

// ==============================
//           Devices
// ==============================

Object.defineProperties(Device.prototype, {
  config: {
    get() {
      this.checkInit()
      if (this.type === `opcua`) {
        return Opcua.instances.find((instance) => {
          return instance._device === this._id
        })
      } else if (this.type === `modbus`) {
        return Modbus.instances.find((instance) => {
          return instance._device === this._id
        })
      } else {
        //default to EthernetIP
        return EthernetIP.instances.find((instance) => {
          return instance._device === this._id
        })
      }
    },
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    },
  },
  mqttSource: {
    get() {
      this.checkInit()
      return MqttSource.instances.find((instance) => {
        return instance._device === this._id
      })
    },
  },
})

// Opcua
Opcua.create = async function (
  name,
  description,
  host,
  port,
  retryRate,
  createdBy
) {
  const device = await Device.create(name, description, `opcua`, createdBy)
  const fields = {
    device: device.id,
    host,
    port,
    retryRate,
  }
  return this._createModel(fields)
}

Object.defineProperties(Opcua.prototype, {
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    },
  },
  sources: {
    get() {
      this.checkInit()
      return OpcuaSource.instances.filter((instance) => {
        return instance.opcua.id === this.id
      })
    },
  },
})

Object.defineProperties(OpcuaSource.prototype, {
  opcua: {
    get() {
      this.checkInit()
      return Opcua.findById(this._opcua)
    },
  },
  device: {
    get() {
      this.checkInit()
      return this.opcua.device
    },
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
    },
  },
})

// Modbus
Modbus.create = async function (
  name,
  description,
  host,
  port,
  reverseBits,
  reverseWords,
  zeroBased,
  timeout,
  retryRate,
  createdBy
) {
  const device = await Device.create(name, description, `modbus`, createdBy)
  const fields = {
    device: device.id,
    host,
    port,
    reverseBits,
    reverseWords,
    zeroBased,
    timeout,
    retryRate,
  }
  return this._createModel(fields)
}

Object.defineProperties(Modbus.prototype, {
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    },
  },
  sources: {
    get() {
      this.checkInit()
      return ModbusSource.instances.filter((instance) => {
        return instance.modbus.id === this.id
      })
    },
  },
})

Object.defineProperties(ModbusSource.prototype, {
  modbus: {
    get() {
      this.checkInit()
      return Modbus.findById(this._modbus)
    },
  },
  device: {
    get() {
      this.checkInit()
      return this.modbus.device
    },
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
    },
  },
})

// EthernetIP
EthernetIP.create = async function (name, description, host, slot, createdBy) {
  const device = await Device.create(name, description, `ethernetip`, createdBy)
  const fields = {
    device: device.id,
    host,
    slot,
  }
  return this._createModel(fields)
}

Object.defineProperties(EthernetIP.prototype, {
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    },
  },
  sources: {
    get() {
      this.checkInit()
      return EthernetIPSource.instances.filter((instance) => {
        return instance.ethernetip.id === this.id
      })
    },
  },
})

Object.defineProperties(EthernetIPSource.prototype, {
  ethernetip: {
    get() {
      this.checkInit()
      return EthernetIP.findById(this._ethernetip)
    },
  },
  device: {
    get() {
      this.checkInit()
      return this.ethernetip.device
    },
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
    },
  },
})

// ==============================
//           Services
// ==============================

Object.defineProperties(Service.prototype, {
  config: {
    get() {
      this.checkInit()
      //default to Mqtt
      return Mqtt.instances.find((instance) => {
        return instance._service === this._id
      })
    },
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    },
  },
})

Mqtt.create = async function (
  name,
  description,
  host,
  port,
  group,
  node,
  username,
  password,
  devices,
  rate,
  encrypt,
  recordLimit,
  createdBy,
  primaryHosts
) {
  const service = await Service.create(name, description, 'mqtt', createdBy)
  const fields = {
    service: service.id,
    host,
    port,
    group,
    node,
    username,
    password,
    rate,
    encrypt,
    recordLimit,
    primaryHosts,
  }
  const mqtt = await this._createModel(fields)
  for (device of devices) {
    await MqttSource.create(mqtt.id, device)
  }
  return mqtt
}

Mqtt.prototype.publish = async function () {
  for (const source of this.sources) {
    const payload = source.rtHistory.map((record) => {
      const tag = Tag.findById(record.id)
      return {
        name: tag.name,
        value: record.value,
        type: tag.datatype,
        timestamp: record.timestamp,
      }
    })
    if (payload.length > 0) {
      await this.client.publishDeviceData(`${source.device.name}`, {
        timestamp: getUnixTime(new Date()),
        metrics: [...payload],
      })
    }
    source.rtHistory = []
  }
}

Mqtt.prototype.publishHistory = async function () {
  const hosts = this.primaryHosts.filter((host) => {
    return host.readyForData
  })
  let historyToPublish = []
  for (const host of hosts) {
    const history = await host.getHistory(this.recordLimit)
    const newRecords = history.filter((record) => {
      return !historyToPublish.some((row) => {
        return row.id === record.id
      })
    })
    historyToPublish = [...historyToPublish, ...newRecords]
  }
  const devices = historyToPublish.reduce((a, record) => {
    const source = MqttSource.findById(record.source)
    return a.some((device) => {
      return device.id === source.device.id
    })
      ? a
      : [...a, source.device]
  }, [])
  for (device of devices) {
    const payload = historyToPublish
      .filter((record) => {
        const source = MqttSource.findById(record.source)
        return device.id === source.device.id
      })
      .map((record) => {
        const tag = Tag.findById(record.tag)
        return {
          name: tag.name,
          value: tag.datatype === 'BOOLEAN' ? !!+record.value : record.value,
          timestamp: record.timestamp,
          type: tag.datatype,
          isHistorical: true,
        }
      })
    this.client.publishDeviceData(`${device.name}`, {
      timestamp: getUnixTime(new Date()),
      metrics: [...payload],
    })
  }
  let sql = `DELETE FROM mqttPrimaryHostHistory WHERE id in (${'?,'
    .repeat(historyToPublish.length)
    .slice(0, -1)})`
  let params = historyToPublish.map((record) => {
    return record.id
  })
  await this.constructor.executeUpdate(sql, params)
  sql = `DELETE FROM mqttHistory 
    WHERE id IN (
      SELECT a.id AS id 
      FROM mqttHistory AS a 
      LEFT JOIN mqttPrimaryHostHistory AS b 
      on a.id = b.mqttHistory 
      WHERE b.id IS NULL LIMIT 750
    )`
  await this.constructor.executeUpdate(sql)
}

Mqtt.prototype.onDcmd = function (payload) {
  const { metrics } = payload
  for (metric of metrics) {
    const tag = Tag.instances.find((tag) => metric.name === tag.name)
    tag.setValue(metric.value)
  }
}

Object.defineProperties(Mqtt.prototype, {
  service: {
    get() {
      this.checkInit()
      return Service.findById(this._service)
    },
  },
  sources: {
    get() {
      this.checkInit()
      return MqttSource.instances.filter((instance) => {
        return instance.mqtt.id === this.id
      })
    },
  },
})

MqttSource.prototype.log = async function (scanClassId) {
  const scanClass = ScanClass.findById(scanClassId)
  const tags = Tag.instances.filter((tag) => {
    if (tag.source && !tag.prevChangeWithinDeadband) {
      return (
        tag.scanClass.id === scanClass.id &&
        this.device.id === tag.source.device.id
      )
    } else {
      return false
    }
  })
  // TO-DO check how long it has been since last change, if it's been a while, log the previous value before out of deadband was detected.
  const preDeadbandExitPoints = tags
    .filter((tag) => {
      const secondsSinceChange = tag.lastChangeOn - tag.prevChangeOn
      return secondsSinceChange >= (tag.scanClass.rate / 1000.0) * 3
    })
    .map((tag) => {
      return {
        id: tag.id,
        value: tag.prevValue,
        timestamp: tag.lastChangeOn,
      }
    })
  // The following is to collect realtime history of events to be published without isHistorical
  if (tags.length > 0) {
    this.rtHistory = [
      ...this.rtHistory,
      ...preDeadbandExitPoints,
      ...tags.map((tag) => {
        return {
          id: tag.id,
          value: tag.value,
          timestamp: getUnixTime(new Date()),
        }
      }),
    ]
    console.log(this.rtHistory)
  }
  // The following is to collect history in the event of a primaryHost going offline
  if (tags.length > 0) {
    await new Promise((resolve) => {
      this.db.serialize(async () => {
        let sql = `INSERT INTO mqttHistory (mqttSource, timestamp)`
        sql = `${sql} VALUES (?,?);`
        let params = [this.id, getUnixTime(new Date())]
        const result = await this.constructor.executeUpdate(sql, params)
        hostsDown = this.mqtt.primaryHosts.filter((host) => !host.readyForData)
        if (hostsDown.length > 0) {
          for (host of hostsDown) {
            sql = `INSERT INTO mqttPrimaryHostHistory (mqttPrimaryHost, mqttHistory)`
            sql = `${sql} VALUES (?,?);`
            params = [host.id, result.lastID]
            await this.constructor.executeUpdate(sql, params)
            this.pubsub.publish('serviceUpdate', {
              serviceUpdate: this.mqtt.service,
            })
          }
          for (const tag of tags.filter(
            (tag) => !tag.prevChangeWithinDeadband
          )) {
            sql = `INSERT INTO mqttHistoryTag (mqttHistory, tag, value)`
            sql = `${sql} VALUES (?,?,?);`
            params = [result.lastID, tag.id, tag.value]
            await this.constructor.executeUpdate(sql, params)
          }
        }
        resolve()
      })
    })
  }
}

Object.defineProperties(MqttSource.prototype, {
  mqtt: {
    get() {
      this.checkInit()
      return Mqtt.findById(this._mqtt)
    },
  },
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    },
  },
})

module.exports = {
  Device,
  Opcua,
  OpcuaSource,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
  Service,
  Mqtt,
  MqttSource,
  Tag,
  ScanClass,
  User,
}
