const {
  Device,
  EthernetIP,
  EthernetIPSource,
  Tag,
  User
} = require('../../../relations')

async function createEthernetIP(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const ethernetip = await EthernetIP.create(
    args.name,
    args.description,
    args.host,
    args.slot,
    createdBy
  ).catch((error) => {
    throw error
  })
  await ethernetip.connect()
  return ethernetip.device
}

async function updateEthernetIP(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const device = Device.findById(args.id)
  if (device) {
    if (args.name) {
      await device.setName(args.name)
    }
    if (args.description) {
      await device.setDescription(args.description)
    }
    if (args.host) {
      await device.config.setHost(args.host)
    }
    if (args.port) {
      await device.config.setSlot(args.port)
    }
    await device.config.connect()
    await device.config.disconnect()
    return device
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

async function deleteEthernetIP(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const device = Device.findById(args.id)
  if (device) {
    await device.config.disconnect()
    return device.delete()
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

async function createEthernetIPSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const device = Device.findById(args.deviceId)
  const tag = Tag.findById(args.tagId)
  if (device) {
    if (device.type === `ethernetip`) {
      if (tag) {
        const config = {
          register: args.register,
          registerType: args.registerType
        }
        return EthernetIPSource.create(
          device.config.id,
          tag.id,
          args.tagname,
          createdBy
        )
      } else {
        throw Error(`There is no tag with id ${args.tagId}`)
      }
    } else {
      throw Error(
        `The device named ${device.name} is not an ethernetip device.`
      )
    }
  } else {
    throw Error(`There is no device with id ${args.id}`)
  }
}

async function updateEthernetIPSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const tag = Tag.findById(args.tagId)
  if (tag) {
    if (args.tagname) {
      await tag.source.setTagname(args.tagname)
    }
    return tag.source
  } else {
    throw new Error(`Tag with id ${args.id} does not exist.`)
  }
}

async function deleteEthernetIPSource(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const tag = Tag.findById(args.tagId)
  if (tag) {
    return tag.source.delete()
  } else {
    throw new Error(`Tag with id ${args.id} does not exist.`)
  }
}

module.exports = {
  createEthernetIP,
  updateEthernetIP,
  deleteEthernetIP,
  createEthernetIPSource,
  updateEthernetIPSource,
  deleteEthernetIPSource
}
