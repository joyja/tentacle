const { Tag, ScanClass } = require('./tag')
const {
  Device,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource
} = require('./device')
const { Service, Mqtt, MqttSource, MqttHistory } = require('./service')
const { User } = require('./auth')
const getTime = require('date-fns/getTime')

// This file creates any properties that form relationships with other models.
// It is defined here to prevent circular dependencies.

// ==============================
//           Tags
// ==============================

ScanClass.prototype.scan = async function() {
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
    }
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    }
  }
})

Tag.prototype.setScanClass = async function(id) {
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
    }
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
      return source
    }
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    }
  }
})

// ==============================
//           Devices
// ==============================

Object.defineProperties(Device.prototype, {
  config: {
    get() {
      this.checkInit()
      if (this.type === `modbus`) {
        return Modbus.instances.find((instance) => {
          return instance._device === this._id
        })
      } else {
        //default to EthernetIP
        return EthernetIP.instances.find((instance) => {
          return instance._device === this._id
        })
      }
    }
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    }
  },
  mqttSource: {
    get() {
      this.checkInit()
      return MqttSource.instances.find((instance) => {
        return instance._device === this._id
      })
    }
  }
})

// Modbus
Modbus.create = async function(
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
    retryRate
  }
  return this._createModel(fields)
}

Object.defineProperties(Modbus.prototype, {
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    }
  },
  sources: {
    get() {
      this.checkInit()
      return ModbusSource.instances.filter((instance) => {
        return instance.modbus.id === this.id
      })
    }
  }
})

Object.defineProperties(ModbusSource.prototype, {
  modbus: {
    get() {
      this.checkInit()
      return Modbus.findById(this._modbus)
    }
  },
  device: {
    get() {
      this.checkInit()
      return this.modbus.device
    }
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
    }
  }
})

// EthernetIP
EthernetIP.create = async function(name, description, host, slot, createdBy) {
  const device = await Device.create(name, description, `ethernetip`, createdBy)
  const fields = {
    device: device.id,
    host,
    slot
  }
  return this._createModel(fields)
}

Object.defineProperties(EthernetIP.prototype, {
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    }
  },
  sources: {
    get() {
      this.checkInit()
      return EthernetIPSource.instances.filter((instance) => {
        return instance.ethernetip.id === this.id
      })
    }
  }
})

Object.defineProperties(EthernetIPSource.prototype, {
  ethernetip: {
    get() {
      this.checkInit()
      return EthernetIP.findById(this._ethernetip)
    }
  },
  device: {
    get() {
      this.checkInit()
      return this.ethernetip.device
    }
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
    }
  }
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
    }
  },
  createdBy: {
    get() {
      this.checkInit()
      return User.findById(this._createdBy)
    }
  }
})

Mqtt.create = async function(
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
    primaryHosts
  }
  const mqtt = await this._createModel(fields)
  for (device of devices) {
    await MqttSource.create(mqtt.id, device)
  }
  return mqtt
}

Mqtt.prototype.publishHistory = async function() {
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
          isHistorical: true
        }
      })
    this.client.publishDeviceData(`${device.name}`, {
      timestamp: getTime(new Date()),
      metrics: [...payload]
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

Mqtt.prototype.onDcmd = function(payload) {
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
    }
  },
  sources: {
    get() {
      this.checkInit()
      return MqttSource.instances.filter((instance) => {
        return instance.mqtt.id === this.id
      })
    }
  }
})

MqttSource.prototype.log = async function(scanClassId) {
  const scanClass = ScanClass.findById(scanClassId)
  const tags = Tag.instances.filter((tag) => {
    if (tag.source) {
      return (
        tag.scanClass.id === scanClass.id &&
        this.device.id === tag.source.device.id
      )
    } else {
      return false
    }
  })
  if (tags.length > 0) {
    await new Promise((resolve) => {
      this.db.serialize(async () => {
        let sql = `INSERT INTO mqttHistory (mqttSource, timestamp)`
        sql = `${sql} VALUES (?,?);`
        let params = [this.id, getTime(new Date())]
        const result = await this.constructor.executeUpdate(sql, params)
        for (host of this.mqtt.primaryHosts) {
          sql = `INSERT INTO mqttPrimaryHostHistory (mqttPrimaryHost, mqttHistory)`
          sql = `${sql} VALUES (?,?);`
          params = [host.id, result.lastID]
          await this.constructor.executeUpdate(sql, params)
          this.pubsub.publish('serviceUpdate', {
            serviceUpdate: this.mqtt.service
          })
        }
        for (const tag of tags) {
          let sql = `INSERT INTO mqttHistoryTag (mqttHistory, tag, value)`
          sql = `${sql} VALUES (?,?,?);`
          let params = [result.lastID, tag.id, tag.value]
          await this.constructor.executeUpdate(sql, params)
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
    }
  },
  device: {
    get() {
      this.checkInit()
      return Device.findById(this._device)
    }
  }
})

module.exports = {
  Device,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
  Service,
  Mqtt,
  MqttSource,
  Tag,
  ScanClass,
  User
}
