const { User } = require(`../../auth`)

async function devices(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  return context.devices
}

module.exports = {
  devices
}
