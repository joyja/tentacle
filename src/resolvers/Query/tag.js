const { User } = require('../../auth')

async function tags(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  return context.tags
}

async function scanClasses(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  return context.scanClasses
}

module.exports = {
  tags,
  scanClasses
}
