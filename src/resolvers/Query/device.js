const { User } = require(`../../auth`)

async function devices(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  return context.devices
}

module.exports = {
  devices
}
