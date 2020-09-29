const { Model } = require(`../database`)
const {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
} = require('node-opcua')
const logger = require('../logger')

class Opcua extends Model {
  static async initialize(db, pubsub) {
    const result = await super.initialize(db, pubsub)
  }
  static _createModel(fields) {
    return super.create(fields)
  }
  static async delete(selector) {
    const deleted = super.delete(selector)
    return deleted
  }
  constructor(selector, checkExists = true) {
    super(selector, checkExists)
    const connectionStrategy = {
      initialDelay: 1000,
      maxRetry: 1,
    }
    const options = {
      applicationName: 'tentacle',
      connectionStrategy: connectionStrategy,
      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,
      endpoint_must_exist: false,
    }
    this.client = OPCUAClient.create(options)
  }
  async init() {
    const result = await super.init()

    this._device = result.device
    this._host = result.host
    this._port = result.port
    this._retryRate = result.retryRate
    this.connected = false
    this.error = null
    this.retryCount = 0
  }
  async connect() {
    if (!this.connected) {
      this.error = null
      logger.info(
        `Connecting to opcua device ${this.device.name}, host: ${this.host}, port: ${this.port}.`
      )
      await this.client
        .connect(`opc.tcp://${this.host}:${this.port}`)
        .catch((error) => {
          this.error = error.message
          this.connected = false
          if (!this.retryInterval) {
            this.retryInterval = setInterval(async () => {
              logger.info(
                `Retrying connection to opcua device ${this.device.name}, retry attempts: ${this.retryCount}.`
              )
              this.retryCount += 1
              await this.connect()
            }, this.retryRate)
          }
        })
      this.session = await this.client.createSession()
      if (!this.error) {
        this.retryCount = 0
        this.retryInterval = clearInterval(this.retryInterval)
        logger.info(
          `Connected to opcua device ${this.device.name}, host: ${this.host}, port: ${this.port}.`
        )
        this.connected = true
      } else {
        this.connected = false
        logger.info(
          `Connection failed to opcua device ${this.device.name}, host: ${this.host}, port: ${this.port}, with error: ${this.error}.`
        )
      }
      this.pubsub.publish('deviceUpdate', {
        deviceUpdate: this.device,
      })
    }
  }
  async disconnect() {
    this.retryCount = 0
    this.retryInterval = clearInterval(this.retryInterval)
    logger.info(`Disconnecting from modbus device ${this.device.name}`)
    const logText = `Closed connection to modbus device ${this.device.name}.`
    if (this.connected) {
      await this.session.close()
      await this.client.disconnect()
      logger.info(logText)
      resolve()
    } else {
      logger.info(logText)
    }
    this.connected = false
    this.pubsub.publish('deviceUpdate', {
      deviceUpdate: this.device,
    })
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
  browse() {
    if (this.connected) {
      this.session.brows('RootFolder')
      console.log('references of RootFolder :')
      for (const reference of browseResult.references) {
        console.log('   -> ', reference.browseName.toString())
      }
    } else {
      logger.error(`Cannot browse until the service is connected.`)
    }
  }
}
Opcua.table = `modbus`
Opcua.fields = [
  { colName: 'device', colRef: 'device', onDelete: 'CASCADE' },
  { colName: 'host', colType: 'TEXT' },
  { colName: 'port', colType: 'INTEGER' },
  { colName: 'retryRate', colType: 'INTEGER' },
]
Opcua.instances = []
Opcua.initialized = false

module.exports = {
  Opcua,
}
