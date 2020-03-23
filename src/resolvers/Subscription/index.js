const tag = require('./tag')
const service = require('./service')

module.exports = {
  ...service,
  ...tag
}
