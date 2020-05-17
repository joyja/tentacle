const auth = require('./auth')
const tag = require('./tag/tag')
const device = require('./device')
const service = require('./service')

module.exports = {
  ...auth,
  ...tag,
  ...device,
  ...service,
}
