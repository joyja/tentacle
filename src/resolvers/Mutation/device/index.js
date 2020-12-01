const opcua = require('./opcua')
const modbus = require('./modbus')
const ethernetip = require('./ethernetip')

module.exports = {
  ...opcua,
  ...modbus,
  ...ethernetip,
}
