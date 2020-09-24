const { User } = require(`../../auth`)

async function services(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  return context.services
}

module.exports = {
  services,
}
