const {
  Device,
  Modbus,
  ModbusSource,
  Tag,
  User
} = require('../../../relations')

async function createModbus(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const modbus = await Modbus.create(
    args.name,
    args.description,
    args.host,
    args.port,
    args.reverseBits,
    args.reverseWords,
    args.zeroBased,
    createdBy
  ).catch((error) => {
    throw error
  })
  await modbus.connect()
  return modbus.device
}

async function updateModbus(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const device = Device.findById(args.id)
  if (device) {
    if (args.name) {
      await device.setName(args.name).catch((error) => {
        throw error
      })
    }
    if (args.description) {
      await device.setDescription(args.description)
    }
    if (args.host) {
      await device.config.setHost(args.host)
    }
    if (args.port) {
      await device.config.setPort(args.port)
    }
    if (args.reverseBits !== undefined) {
      await device.config.setReverseBits(args.reverseBits)
    }
    if (args.reversWords !== undefined) {
      await device.config.setReversWords(args.reversWords)
    }
    if (args.zeroBased !== undefined) {
      await device.config.setZeroBased(args.zeroBased)
    }
    await device.config.disconnect()
    await device.config.connect()
    return device
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

async function deleteModbus(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const device = Device.findById(args.id)
  if (device) {
    // await device.config.disconnect()
    return device.delete()
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

async function createModbusSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const device = Device.findById(args.deviceId)
  const tag = Tag.findById(args.tagId)
  if (device) {
    if (device.type === `modbus`) {
      if (tag) {
        const config = {
          register: args.register,
          registerType: args.registerType
        }
        return ModbusSource.create(
          device.config.id,
          tag.id,
          args.register,
          args.registerType,
          createdBy
        ).catch((error) => {
          throw error
        })
      } else {
        throw Error(`There is no tag with id ${args.tagId}`)
      }
    } else {
      throw Error(`The device named ${device.name} is not a modbus device.`)
    }
  } else {
    throw Error(`There is no device with id ${args.id}`)
  }
}

async function updateModbusSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const tag = Tag.findById(args.tagId)
  if (tag) {
    if (args.register) {
      await tag.source.setRegister(args.register)
    }
    if (args.registerType) {
      await tag.source.setRegisterType(args.registerType)
    }
    return tag.source
  } else {
    throw new Error(`Tag with id ${args.tagId} does not exist.`)
  }
}

async function deleteModbusSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const tag = Tag.findById(args.tagId)
  if (tag) {
    return tag.source.delete()
  } else {
    throw new Error(`Tag with id ${args.tagId} does not exist.`)
  }
}

module.exports = {
  createModbus,
  updateModbus,
  deleteModbus,
  createModbusSource,
  updateModbusSource,
  deleteModbusSource
}
