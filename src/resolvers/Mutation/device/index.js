const modbus = require('./modbus')
const ethernetip = require('./ethernetip')

module.exports = {
  ...modbus,
  ...ethernetip,
}
