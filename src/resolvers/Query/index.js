const tag = require('./tag')
const device = require('./device')
const service = require('./service')

module.exports = {
  ...tag,
  ...device,
  ...service
}
