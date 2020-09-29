const { Device, Opcua, Tag, User } = require('../../../relations')

async function createOpcua(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const createdBy = user.id
  const opcua = await Opcua.create(
    args.name,
    args.description,
    args.host,
    args.port,
    args.retryRate,
    createdBy
  )
  await opcua.connect()
  return opcua.device
}

async function updateOpcua(root, args, context, info) {
  const user = await User.getUserFromContext(context)
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
      await device.config.setPort(args.port)
    }
    if (args.retryRate) {
      await device.config.setRetryRate(args.retryRate)
    }
    await device.config.disconnect()
    await device.config.connect()
    return device
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

async function deleteOpcua(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const device = Device.findById(args.id)
  if (device) {
    // await device.config.disconnect()
    return device.delete()
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

module.exports = {
  createOpcua,
  updateOpcua,
  deleteOpcua,
}
