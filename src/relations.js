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

// This file creates any properties that form relationships with other models.
// It is defined here to prevent circular dependencies.

// ==============================
//           Tags
// ==============================

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

Tag.prototype.setScanClass = function(id) {
  const scanClass = ScanClass.findById(id)
  if (scanClass) {
    this.scanClass = scanClass
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
      }
      if (this.type === `ethernetip`) {
        return EthernetIP.instances.find((instance) => {
          return instance._device === this._id
        })
      }
      return null
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
    timeout
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
      if (this.type === `mqtt`) {
        return Mqtt.instances.find((instance) => {
          return instance._service === this._id
        })
      }
      return null
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
  createdBy
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
    encrypt
  }
  const mqtt = await this._createModel(fields)
  for (device of devices) {
    await MqttSource.create(mqtt.id, device)
  }
  return mqtt
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

MqttSource.prototype.log = async function(tagId) {
  const tag = Tag.findById(tagId)
  await MqttHistory.create(this.id, tag.id, tag.value)
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
  },
  history: {
    get() {
      this.checkInit()
      return MqttHistory.instances.filter((instances) => {
        return instance.mqttSource.id === this.id
      })
    }
  }
})

Object.defineProperties(MqttHistory.prototype, {
  mqtt: {
    get() {
      this.checkInit()
      return Mqtt.findById(this._mqtt)
    }
  },
  tag: {
    get() {
      this.checkInit()
      return Tag.findById(this._tag)
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
  MqttHistory,
  Tag,
  ScanClass,
  User
}
