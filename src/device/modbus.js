const { Model } = require(`../database`)
const ModbusRTU = require(`modbus-serial`)

class Modbus extends Model {
  static async initialize(db, pubsub) {
    await ModbusSource.initialize(db, pubsub)
    const result = await super.initialize(db, pubsub)
    if (this.tableExisted && this.version < 4) {
      const newColumns = [
        { colName: 'retryRate', colType: 'INTEGER', default: 5000 }
      ]
      for (const column of newColumns) {
        let sql = `ALTER TABLE "${this.table}" ADD "${column.colName}" ${column.colType}`
        if (column.default) {
          sql = `${sql} DEFAULT ${column.default}`
        }
        await this.executeUpdate(sql)
      }
    }
    return result
  }
  static _createModel(fields) {
    return super.create(fields)
  }
  static async delete(selector) {
    const deleted = super.delete(selector)
    ModbusSource.getAll()
    return deleted
  }
  constructor(selector, checkExists = true) {
    super(selector, checkExists)
    this.client = new ModbusRTU()
    this.client.setID(1)
  }
  async init() {
    const result = await super.init()
    this._device = result.device
    this._host = result.host
    this._port = result.port
    this._reverseBits = result.reverseBits
    this._reverseWords = result.reverseWords
    this._zeroBased = result.zeroBased
    this.client.setTimeout(result.timeout)
    this._retryRate = result.retryRate
    this.connected = false
    this.error = null
  }
  async connect() {
    if (!this.connected) {
      this.error = null
      await this.client
        .connectTCP(this.host, { port: this.port })
        .catch((error) => {
          this.error = error.message
          this.connected = false
          if (!this.retryInterval) {
            this.retryInterval = setInterval(async () => {
              await this.connect()
            }, this.retryRate)
          }
        })
      if (!this.error) {
        this.retryInterval = clearInterval(this.retryInterval)
        this.connected = true
      } else {
        this.connected = false
      }
    }
  }
  async disconnect() {
    await new Promise((resolve, reject) => {
      this.retryInterval = clearInterval(this.retryInterval)
      this.client.close(() => {
        resolve()
      })
    })
    this.connected = false
  }
  get host() {
    this.checkInit()
    return this._host
  }
  setHost(value) {
    return this.update(this.id, 'host', value).then(
      (result) => (this._host = result)
    )
  }
  get port() {
    this.checkInit()
    return this._port
  }
  setPort(value) {
    return this.update(this.id, 'port', value).then(
      (result) => (this._port = result)
    )
  }
  get reverseBits() {
    this.checkInit()
    return Boolean(this._reverseBits)
  }
  setReverseBits(value) {
    return this.update(this.id, 'reverseBits', value).then((result) => {
      this._reverseBits = result
    })
  }
  get reverseWords() {
    this.checkInit()
    return Boolean(this._reverseWords)
  }
  setReverseWords(value) {
    return this.update(this.id, 'reverseWords', value).then(
      (result) => (this._reverseWords = result)
    )
  }
  get zeroBased() {
    this.checkInit()
    return Boolean(this._zeroBased)
  }
  setZeroBased(value) {
    return this.update(this.id, 'zeroBased', value).then(
      (result) => (this._zeroBased = result)
    )
  }
  get timeout() {
    this.checkInit()
    return this.client.getTimeout()
  }
  setTimeout(value) {
    return this.update(this.id, 'timeout', value).then((result) =>
      this.client.setTimeout(result)
    )
  }
  get retryRate() {
    this.checkInit()
    return this._retryRate
  }
  setRetryRate(value) {
    return this.update(this.id, 'retryRate', value).then(
      (result) => (this._retryRate = result)
    )
  }
  get status() {
    if (this.connected) {
      return `connected`
    } else if (this.error) {
      return this.error
    } else {
      return `connecting`
    }
  }
}
Modbus.table = `modbus`
Modbus.fields = [
  { colName: 'device', colRef: 'device', onDelete: 'CASCADE' },
  { colName: 'host', colType: 'TEXT' },
  { colName: 'port', colType: 'INTEGER' },
  { colName: 'reverseBits', colType: 'INTEGER' },
  { colName: 'reverseWords', colType: 'INTEGER' },
  { colName: 'zeroBased', colType: 'INTEGER' },
  { colName: 'timeout', colType: 'INTEGER' },
  { colName: 'retryRate', colType: 'INTEGER' }
]
Modbus.instances = []
Modbus.initialized = false

class ModbusSource extends Model {
  static create(modbus, tag, register, registerType) {
    const fields = {
      modbus,
      tag,
      register,
      registerType
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._modbus = result.modbus
    this._tag = result.tag
    this._register = result.register
    this._registerType = result.registerType
  }
  formatValue(data) {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    let value = null
    if (this.tag.datatype === `FLOAT`) {
      view.setInt16(
        0,
        this.modbus.reverseWords ? data[1] : data[0],
        this.modbus.reverseBits
      )
      view.setInt16(
        2,
        this.modbus.reverseWords ? data[0] : data[1],
        this.modbus.reverseBits
      )
      value = view.getFloat32(0, this.modbus.reverseBits)
    } else if (this.tag.datatype === `INT32`) {
      view.setInt16(
        0,
        this.modbus.reverseWords ? data[1] : data[0],
        this.modbus.reverseBits
      )
      view.setInt16(
        2,
        this.modbus.reverseWords ? data[0] : data[1],
        this.modbus.reverseBits
      )
    } else if (this.tag.datatype === `INT16`) {
      view.setInt16(0, data[0], this.modbus.reverseBits)
      value = view.getInt16(0, this.modbus.reverseBits)
    }
    return value
  }
  async read() {
    if (this.modbus.connected) {
      if (this.registerType === 'INPUT_REGISTER') {
        const quantity = this.format === 'INT16' ? 1 : 2
        return new Promise((resolve, reject) => {
          this.modbus.client.readInputRegisters(
            this.register,
            quantity,
            async (error, data) => {
              if (error) {
                reject(error)
                return
              }
              if (data) {
                await this.tag.setValue(this.formatValue(data.data))
              }
              resolve()
            }
          )
        }).catch(async (error) => {
          if (error.name === 'TransactionTimedOutError') {
            await this.modbus.disconnect()
            await this.modbus.connect()
          }
        })
      } else if (this.registerType === 'HOLDING_REGISTER') {
        const quantity = this.format === 'INT16' ? 1 : 2
        return new Promise((resolve, reject) => {
          this.modbus.client.readHoldingRegisters(
            this.register,
            quantity,
            (error, data) => {
              if (error) {
                reject(error)
                return
              }
              if (data) {
                this.tag.setValue(this.formatValue(data.data))
              }
              resolve()
            }
          )
        }).catch(async (error) => {
          if (error.name === 'TransactionTimedOutError') {
            await this.modbus.disconnect()
            await this.modbus.connect()
          }
        })
      } else if (this.registerType === 'DISCRETE_INPUT') {
        return new Promise((resolve, reject) => {
          this.modbus.client.readDiscreteInputs(
            this.register,
            1,
            async (error, data) => {
              if (error) {
                reject(error)
                return
              } else {
                if (data) {
                  await this.tag.setValue(data.data[0])
                }
                resolve()
              }
            }
          )
        }).catch(async (error) => {
          if (error.name === 'TransactionTimedOutError') {
            await this.modbus.disconnect()
            await this.modbus.connect()
          }
        })
      }
    }
  }
  get register() {
    this.checkInit()
    return this._register
  }
  setRegister(value) {
    return this.update(this.id, 'register', value).then(
      (result) => (this._register = result)
    )
  }
  get registerType() {
    this.checkInit()
    return this._registerType
  }
  setRegisterType(value) {
    return this.update(this.id, 'registerType', value).then(
      (result) => (this._registerType = result)
    )
  }
}
ModbusSource.table = `modbusSource`
ModbusSource.fields = [
  { colName: 'modbus', colRef: 'modbus', onDelete: 'CASCADE' },
  { colName: 'tag', colRef: 'tag', onDelete: 'CASCADE' },
  { colName: 'register', colType: 'INTEGER' },
  { colName: 'registerType', colType: 'TEXT' }
]
ModbusSource.instances = []
ModbusSource.initialized = false

module.exports = {
  Modbus,
  ModbusSource
}
