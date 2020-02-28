const user = require('./user')
const tag = require('./tag')
const device = require('./device')
const service = require('./service')

module.exports = {
  ...user,
  ...tag,
  ...device,
  ...service
}
