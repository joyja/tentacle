const { Device } = require('./device')
const { Modbus, ModbusSource } = require('./modbus')
const { EthernetIP, EthernetIPSource } = require('./ethernetip')
const { Opcua } = require('./opcua')

module.exports = {
  Device,
  Opcua,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
}
