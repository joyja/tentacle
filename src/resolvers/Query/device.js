const { User } = require(`../../auth`)
const { Device } = require('../../relations')

async function devices(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  return context.devices
}

async function device(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const device = Device.findById(args.id)
  if (device) {
    return device
  } else {
    throw new Error(`Device with id ${args.id} does not exist.`)
  }
}

module.exports = {
  devices,
  device,
}
