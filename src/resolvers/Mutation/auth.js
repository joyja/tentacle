const { User } = require('../../relations')

async function createUser(root, args, context, info) {
  await User.getUserFromContext(context)
  return User.create(args.username, args.password)
}

async function login(root, args, context, info) {
  return User.login(args.username, args.password)
}

async function changePassword(root, args, context, info) {
  return User.changePassword(context, args.oldPassword, args.newPassword)
}

module.exports = {
  login,
  changePassword,
  createUser
}
