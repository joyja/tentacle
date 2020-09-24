const { User } = require('../../auth')

async function tags(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  return context.tags
}

async function scanClasses(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  return context.scanClasses
}

module.exports = {
  tags,
  scanClasses,
}
