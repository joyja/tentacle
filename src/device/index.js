const { Device } = require('./device')
const { Modbus, ModbusSource } = require('./modbus')
const { EthernetIP, EthernetIPSource } = require('./ethernetip')

module.exports = {
  Device,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
}
