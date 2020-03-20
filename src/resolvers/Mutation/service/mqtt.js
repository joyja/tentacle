const { Service, Mqtt, Tag, User } = require('../../../relations')

async function createMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context)
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
    args.recordLimit,
    createdBy,
    args.primaryHosts ? args.primaryHosts : []
  )
  await mqtt.connect()
  return mqtt.service
}

async function updateMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context)
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
    if (args.rate) {
      await service.config.setRate(args.rate)
    }
    if (args.encrypt !== undefined) {
      await service.config.setEncrypt(args.encrypt)
    }
    if (args.recordLimit !== undefined) {
      await service.config.setRecordLimit(args.recordLimit)
    }
    await service.config.disconnect()
    await service.config.connect()
    return service
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

async function deleteMqtt(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const service = Service.findById(args.id)
  if (service) {
    await service.config.disconnect()
    return service.delete()
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}
async function addMqttPrimaryHost(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const service = Service.findById(args.id)
  if (service) {
    if (service.type === `mqtt`) {
      return service.config.addPrimaryHost(args.name)
    } else {
      throw new Error(
        `Service with id ${args.id} is not an mqtt service. It's type ${service.type}`
      )
    }
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}
async function deleteMqttPrimaryHost(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const service = Service.findById(args.id)
  if (service) {
    if (service.type === `mqtt`) {
      return service.config.deletePrimaryHost(args.name)
    } else {
      throw new Error(
        `Service with id ${args.id} is not an mqtt service. It's type ${service.type}`
      )
    }
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

async function addMqttSource(root, args, context, info) {
  await User.getUserFromContext(context)
  const service = Service.findById(args.id)
  if (service) {
    if (service.type === `mqtt`) {
      await service.config.addSource(args.deviceId)
      return service
    } else {
      throw new Error(
        `Service with id ${args.id} is not an mqtt service. It's type ${service.type}`
      )
    }
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

async function deleteMqttSource(root, args, context, info) {
  await User.getUserFromContext(context)
  const service = Service.findById(args.id)
  if (service) {
    if (service.type === `mqtt`) {
      await service.config.deleteSource(args.deviceId)
      return service
    } else {
      throw new Error(
        `Service with id ${args.id} is not an mqtt service. It's type ${service.type}`
      )
    }
  } else {
    throw new Error(`Service with id ${args.id} does not exist.`)
  }
}

module.exports = {
  createMqtt,
  updateMqtt,
  deleteMqtt,
  addMqttPrimaryHost,
  deleteMqttPrimaryHost,
  addMqttSource,
  deleteMqttSource
}
