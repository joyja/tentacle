const { User } = require('../../auth')

async function user(root, args, context, info) {
  return User.getUserFromContext(context)
}

module.exports = {
  user,
}
