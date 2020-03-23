const tag = require('./tag')
const mqttUpdate = require('./mqttUpdate')

module.exports = {
  ...mqttUpdate,
  ...tag
}
