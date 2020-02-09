const { Service, Mqtt, Tag, User } = require('../../../relations')

async function createMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const mqtt = await Mqtt.create(
    args.name,
    args.description,
    args.host,
    args.port,
    args.group,
    args.node,
    args.username,
    args.password,
    args.devices,
    args.rate,
    args.encrypt,
    createdBy
  )
  await mqtt.connect()
  return mqtt.service
}

async function updateMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const service = Service.findById(args.id)
  if (service) {
    if (args.name) {
      await service.setName(args.name)
    }
    if (args.description) {
      await service.setDescription(args.description)
    }
    if (args.host) {
      await service.config.setHost(args.host)
    }
    if (args.port) {
      await service.config.setPort(args.port)
    }
    if (args.group) {
      await service.config.setGroup(args.group)
    }
    if (args.node) {
      await service.config.setNode(args.node)
    }
    if (args.username) {
      await service.config.setUsername(args.username)
    }
    if (args.password) {
      await service.config.setPassword(args.password)
    }
    if (args.devices) {
      await service.config.setDevices(args.devices)
    }
    if (args.rate) {
      await service.config.setRate(args.rate)
    }
    if (args.encrypt !== undefined) {
      await service.config.setEncrypt(args.encrypt)
    }
    await service.config.disconnect()
    await service.config.connect()
    return service
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

async function deleteMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const service = Service.findById(args.id)
  if (service) {
    await service.config.disconnect()
    return service.delete()
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

module.exports = {
  createMqtt,
  updateMqtt,
  deleteMqtt
}
