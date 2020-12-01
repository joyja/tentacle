const { Model } = require(`../database`)
const {
  DataType,
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  makeBrowsePath,
  NodeCrawler,
} = require('node-opcua')
const logger = require('../logger')
const treeify = require('treeify')

class Opcua extends Model {
  static async initialize(db, pubsub) {
    await OpcuaSource.initialize(db, pubsub)
    const result = await super.initialize(db, pubsub)
    return result
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
    this.client.on('connection_failed', async () => {
      if (this.connected) {
        await this.disconnect()
        await this.connect()
      }
    })
    this.client.on('connection_lost', async () => {
      if (this.connected) {
        await this.disconnect()
        await this.connect()
      }
    })
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
    this.nodes = null
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
      if (!this.error) {
        this.retryCount = 0
        this.retryInterval = clearInterval(this.retryInterval)
        logger.info(
          `Connected to opcua device ${this.device.name}, host: ${this.host}, port: ${this.port}.`
        )
        this.connected = true
        this.session = await this.client.createSession()
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
  async browse(nodeId, flat = false) {
    if (this.connected) {
      return new Promise((resolve, reject) => {
        const crawler = new NodeCrawler(this.session)
        let firstScan = true
        let flatResult = []
        if (flat) {
          crawler.on('browsed', (element) => {
            if (element.dataValue) {
              flatResult.push({
                nodeId: element.nodeId.toString(),
                browseName: `${element.nodeId.toString()},${
                  element.browseName.name
                }`,
              })
            }
          })
        }
        crawler.read(nodeId || 'ObjectsFolder', (err, obj) => {
          if (!err) {
            if (flat) {
              resolve(flatResult)
            } else {
              resolve(obj)
            }
          } else {
            reject(err)
          }
        })
      })
    } else {
      return flat ? [] : null
    }
  }
}
Opcua.table = `opcua`
Opcua.fields = [
  { colName: 'device', colRef: 'device', onDelete: 'CASCADE' },
  { colName: 'host', colType: 'TEXT' },
  { colName: 'port', colType: 'INTEGER' },
  { colName: 'retryRate', colType: 'INTEGER' },
]
Opcua.instances = []
Opcua.initialized = false

class OpcuaSource extends Model {
  static create(opcua, tag, nodeId) {
    const fields = {
      opcua,
      tag,
      nodeId,
    }
    return super.create(fields)
  }
  async init() {
    const result = await super.init()
    this._opcua = result.opcua
    this._tag = result.tag
    this._nodeId = result.nodeId
  }
  async read() {
    if (this.opcua.connected) {
      try {
        const {
          value: { value },
        } = await this.opcua.session
          .readVariableValue(this.nodeId)
          .catch((error) => logger.error(error))
        await this.tag.setValue(value, false)
      } catch (error) {
        logger.error(error)
      }
    }
  }
  async write(inputValue) {
    if (this.opcua.connected) {
      let dataType
      let value
      if (this.tag.datatype === 'BOOLEAN') {
        dataType = DataType.Boolean
        value = inputValue + '' === 'true'
      } else if (this.tag.datatype === 'FLOAT') {
        dataType = DataType.Float
        value = parseFloat(value)
      } else if (this.tag.datatype === 'INT32') {
        dataType = DataType.Int32
        value = parseInt(value)
      } else {
        dataType = DataType.String
        value = inputValue
      }
      await this.opcua.session
        .writeSingleNode(this.nodeId, { value, dataType })
        .catch((error) => logger.error(error))
    }
  }
  get nodeId() {
    this.checkInit()
    return this._nodeId
  }
  setNodeId(value) {
    return this.update(this.id, 'nodeId', value).then(
      (result) => (this._nodeId = result)
    )
  }
}
OpcuaSource.table = `opcuaSource`
OpcuaSource.fields = [
  { colName: 'opcua', colRef: 'opcua', onDelete: 'CASCADE' },
  { colName: 'tag', colRef: 'tag', onDelete: 'CASCADE' },
  { colName: 'nodeId', colType: 'TEXT' },
]
OpcuaSource.instances = []
OpcuaSource.initialized = false

module.exports = {
  Opcua,
  OpcuaSource,
}
