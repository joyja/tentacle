const { User } = require('../../relations')

async function login(root, args, context, info) {
  return User.login(args.username, args.password)
}

async function changePassword(root, args, context, info) {
  return User.changePassword(context, args.oldPassword, args.newPassword)
}

module.exports = {
  login,
  changePassword,
}
