jest.mock(`sparkplug-client-jar`)
const sparkplug = require(`sparkplug-client-jar`)
const getUnixTime = require('date-fns/getUnixTime')

const { createTestDb, deleteTestDb } = require('../../../test/db')
const {
  ScanClass,
  Tag,
  User,
  Device,
  Modbus,
  ModbusSource,
  Service,
  Mqtt,
  MqttSource,
  MqttHistory
} = require('../../relations')
const fromUnixTime = require('date-fns/fromUnixTime')

const mockSparkplug = {
  on: jest.fn(),
  publishNodeBirth: jest.fn(),
  publishDeviceBirth: jest.fn(),
  publishDeviceData: jest.fn(),
  publishDeviceDeath: jest.fn(),
  stop: jest.fn(),
  on: jest.fn(),
  subscribePrimaryHost: jest.fn()
}

const pubsub = {}
let db = undefined
beforeAll(async () => {
  db = await createTestDb()
  await ScanClass.initialize(db, pubsub)
  await User.initialize(db, pubsub)
  await Tag.initialize(db, pubsub)
  await Device.initialize(db, pubsub)
  modbus = await Modbus.create(
    `testDevice`,
    `Test Device`,
    `localhost`,
    502,
    true,
    true,
    true,
    User.instances[0].id
  )
  sparkplug.newClient.mockImplementation(() => {
    return mockSparkplug
  })
})

afterAll(async () => {
  await deleteTestDb(db)
})

beforeEach(() => {
  jest.useFakeTimers()
  mockSparkplug.on.mockClear()
  mockSparkplug.publishNodeBirth.mockClear()
  mockSparkplug.publishDeviceBirth.mockClear()
  mockSparkplug.publishDeviceData.mockClear()
  mockSparkplug.publishDeviceDeath.mockClear()
  mockSparkplug.stop.mockClear()
})

test(`Initializing Service, also initializes Mqtt, MqttSource and MqttHistory.`, async () => {
  await Service.initialize(db, pubsub)
  expect(Service.initialized).toBe(true)
  expect(Mqtt.initialized).toBe(true)
  expect(MqttSource.initialized).toBe(true)
  expect(MqttHistory.initialized).toBe(true)
})
let service = null
test(`Mqtt: create creates a service with service config`, async () => {
  user = User.instances[0]
  const name = `aMqtt`
  const description = `A MQTT`
  const host = `localhost`
  const port = 1883
  const group = `aGroup`
  const node = `aNode`
  const username = `aUsername`
  const password = `aPassword`
  const devices = [1]
  const rate = 1000
  const encrypt = true
  const createdBy = user.id
  const primaryHosts = ['aPrimaryHost', 'AnotherPrimaryHost']
  const mqtt = await Mqtt.create(
    name,
    description,
    host,
    port,
    group,
    node,
    username,
    password,
    devices,
    rate,
    encrypt,
    createdBy,
    primaryHosts
  )
  service = mqtt.service
  expect(mqtt.service).toBe(Service.instances[0])
  expect(mqtt.service.name).toBe(name)
  expect(mqtt.service.description).toBe(description)
  expect(mqtt.host).toBe(host)
  expect(mqtt.port).toBe(port)
  expect(mqtt.group).toBe(group)
  expect(mqtt.node).toBe(node)
  expect(mqtt.username).toBe(username)
  expect(mqtt.password).toBe(password)
  expect(mqtt.sources.map((source) => source.device.id)).toEqual(devices)
  expect(mqtt.rate).toBe(rate)
  expect(mqtt.encrypt).toBe(encrypt)
  expect(mqtt.service.createdBy.id).toBe(user.id)
  expect(mqtt.primaryHosts.map((host) => host.name)).toEqual(primaryHosts)
})
test(`Mqtt: add primary host, adds a primary host`, async () => {
  const mqtt = service.config
  const newHostName = `yetAnotherPrimaryHost`
  const prevPrimaryHosts = mqtt.primaryHosts.map((host) => host)
  const newHost = await mqtt.addPrimaryHost(newHostName)
  expect(mqtt.primaryHosts).toEqual([...prevPrimaryHosts, newHost])
})
test(`Mqtt: delete primary host, deletes a primary host`, async () => {
  const mqtt = service.config
  const deletedHost = `yetAnotherPrimaryHost`
  const primaryHosts = mqtt.primaryHosts.map((host) => host)
  await mqtt.deletePrimaryHost(deletedHost)
  expect(mqtt.primaryHosts).toEqual(
    primaryHosts.filter((host) => host.name !== deletedHost)
  )
})
test(`Mqtt: deleting a primary host, that doesn't exist throws an error`, async () => {
  const mqtt = service.config
  const deletedHost = `iDoNotExist`
  const primaryHosts = mqtt.primaryHosts.map((host) => host)
  expect(
    await mqtt.deletePrimaryHost(deletedHost).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: This mqtt service does not have a primary host named iDoNotExist]`
  )
  expect(mqtt.primaryHosts).toEqual(primaryHosts)
})
describe(`Service: `, () => {
  test(`check that init sets the appropriate underscore fields.`, async () => {
    Service.instances = []
    const uninitService = new Service(service.id)
    await uninitService.init()
    expect(uninitService._name).toBe(service._name)
    expect(uninitService._description).toBe(service._description)
    expect(uninitService._type).toBe(service._type)
    expect(uninitService._createdBy).toBe(service._createdBy)
    expect(uninitService._CreatedOn).toBe(service._CreatedOn)
    await Service.getAll()
  })
  test(`Getters all return their underscore values.`, async () => {
    expect(service.name).toBe(service._name)
    expect(service.description).toBe(service._description)
    expect(service.type).toBe(service._type)
    expect(service.createdBy.id).toBe(service._createdBy)
    expect(service.createdOn).toStrictEqual(fromUnixTime(service._createdOn))
  })
  test(`Setters all set the values appropriately.`, async () => {
    const name = `newName`
    const description = `New description`
    await service.setName(name)
    await service.setDescription(description)
    expect(service.name).toBe(name)
    expect(service.description).toBe(description)
  })
})

// ==============================
//          Mqtt
// ==============================

describe(`MQTT: `, () => {
  let mqtt = null
  test(`check that init sets the appropriate underscore fields.`, async () => {
    const mqttId = service.config.id
    Mqtt.instances = []
    mqtt = new Mqtt(mqttId)
    await mqtt.init()
    expect(mqtt._host).toBe(service.config._host)
    expect(mqtt._port).toBe(service.config._port)
    expect(mqtt._group).toBe(service.config._group)
    expect(mqtt._node).toBe(service.config._node)
    expect(mqtt._username).toBe(service.config._username)
    expect(mqtt._password).toBe(service.config._password)
    expect(mqtt._devices).toBe(service.config._devices)
    expect(mqtt._rate).toBe(service.config._rate)
    expect(mqtt._encrypt).toBe(service.config._encrypt)
    expect(mqtt.connected).toBe(false)
    expect(mqtt.error).toBe(null)
    await Mqtt.getAll()
  })
  test(`Connect sets up the sparkplug client.`, async () => {
    await mqtt.connect()
    expect(sparkplug.newClient).toBeCalledTimes(1)
    expect(mockSparkplug.on).toBeCalledTimes(6)
    expect(mockSparkplug.on).toBeCalledWith('reconnect', expect.any(Function))
    expect(mockSparkplug.on).toBeCalledWith('error', expect.any(Function))
    expect(mockSparkplug.on).toBeCalledWith('offline', expect.any(Function))
    expect(mockSparkplug.on).toBeCalledWith('birth', expect.any(Function))
  })
  test(`onBirth calls all appropriate device births and starts publishing.`, () => {
    mqtt.onBirth()
    expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(1)
    expect(mockSparkplug.publishNodeBirth).toBeCalledWith({
      timestamp: expect.any(Number),
      metrics: expect.any(Object)
    })
    expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(
      mqtt.sources.length
    )
    mqtt.sources.forEach((source) => {
      expect(mockSparkplug.publishDeviceBirth).toBeCalledWith(
        `${source.device.name}`,
        {
          timestamp: expect.any(Number),
          metrics: source.device.config.sources.map((deviceSource) => {
            return {
              name: deviceSource.tag.name,
              value: `${deviceSource.tag.value}`,
              type: 'string'
            }
          })
        }
      )
    })
    expect(setInterval).toBeCalledTimes(1)
    expect(setInterval).toBeCalledWith(expect.any(Function), mqtt.rate)
  })
  test(`onOffline stops publishing.`, () => {
    mqtt.onOffline()
    expect(clearInterval).toBeCalledTimes(1)
    expect(clearInterval).toBeCalledWith(mqtt.interval)
  })
  test(`onReconnect stops and then starts publishing.`, () => {
    mqtt.onReconnect()
    expect(clearInterval).toBeCalledTimes(1)
    expect(setInterval).toBeCalledTimes(1)
    expect(setInterval).toBeCalledWith(expect.any(Function), mqtt.rate)
  })
  test(`onError publishing stops and mqtt error property is set.`, () => {
    const error = new Error('A really bad error')
    mqtt.onError(error)
    expect(mqtt.error).toBe(error.message)
    expect(clearInterval).toBeCalledTimes(1)
    mqtt.disconnect()
    mqtt.connect()
  })
  test(`publish publishes realtime and historical values that have been logged`, () => {
    mqtt.publish()
    expect(mockSparkplug.publishDeviceData).toBeCalledTimes(mqtt.sources.length)
  })
  test(`disconnect stops publishing, publishes death, and clears client`, () => {
    mqtt.disconnect()
    expect(clearInterval).toBeCalledTimes(1)
    expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(
      mqtt.sources.length
    )
    mqtt.sources.forEach((source) => {
      expect(mockSparkplug.publishDeviceDeath).toBeCalledWith(
        `${source.device.name}`,
        {
          timestamp: expect.any(Number)
        }
      )
    })
    expect(mockSparkplug.stop).toBeCalledTimes(1)
    expect(mqtt.client).toBe(undefined)
  })
})

describe(`MQTT Source: `, () => {
  test(`Create creates instance and adds to Modbus.sources.`, async () => {
    const mqtt = Mqtt.instances[0]
    const anotherModbus = await Modbus.create(
      `testDevice2`,
      `Test Device 2`,
      `localhost`,
      502,
      true,
      true,
      true,
      User.instances[0].id
    )
    const mqttSource = await MqttSource.create(mqtt.id, anotherModbus.id)
    expect(MqttSource.instances[1].id).toBe(mqttSource.id)
    expect(mqtt.sources[1].id).toBe(mqttSource.id)
  })
  test(`check that init sets the appropriate underscore fields.`, async () => {
    const id = MqttSource.instances[1].id
    const mqttId = MqttSource.instances[1]._mqtt
    const deviceId = MqttSource.instances[1]._device
    MqttSource.instances = []
    mqttSource = new MqttSource(id)
    await mqttSource.init()
    expect(mqttSource._mqtt).toBe(mqttId)
    expect(mqttSource._device).toBe(deviceId)
    await MqttSource.getAll()
  })
})

describe(`MQTT History: `, () => {
  let history = undefined
  test(`Create creates instance and adds to MqttHistory.sources.`, async () => {
    const mqttSource = MqttSource.instances[1]
    const scanClass = await ScanClass.create(1000, User.instances[0].id)
    const tag = await Tag.create(
      `aTag`,
      `A Tag`,
      123,
      scanClass.id,
      User.instances[0].id,
      'FLOAT'
    )
    await ModbusSource.create(
      Device.instances[0].config.id,
      tag.id,
      41234,
      'HOLDING_REGISTER'
    )
    history = await MqttHistory.create(mqttSource.id, tag.id, tag.value)
  })
  test(`check that init sets the appropriate underscore fields.`, async () => {
    const id = MqttHistory.instances[0].id
    const mqttSourceId = MqttHistory.instances[0]._mqttSource
    const tagId = MqttHistory.instances[0]._tag
    const value = MqttHistory.instances[0]._value
    const timestamp = MqttHistory.instances[0]._timestamp
    MqttHistory.instances = []
    mqttHistory = new MqttHistory(id)
    await mqttHistory.init()
    expect(mqttHistory._mqttSource).toBe(mqttSourceId)
    expect(mqttHistory._tag).toBe(tagId)
    expect(mqttHistory._value).toBe(value)
    expect(mqttHistory._timestamp).toBe(timestamp)
    await MqttHistory.getAll()
  })
  test(`Getters all return their underscore values.`, async () => {
    expect(history.value).toBe(history._value)
    expect(getUnixTime(history.timestamp)).toBe(history._timestamp)
  })
})

test(`Mqtt source log creates a historical record for each tag with the device as a source of a specific scan class`, async () => {
  const prevCount = MqttHistory.instances.length
  const mqttSource = MqttSource.instances[1]
  const scanClass = ScanClass.instances[0]
  await mqttSource.log(scanClass.id)
  expect(MqttHistory.instances.length).toBe(
    prevCount +
      scanClass.tags.filter((tag) => {
        if (tag.source) {
          tag.source.device.id === mqttSource.device.id
        } else {
          false
        }
      }).length
  )
})
test(`Publish publishes the real tag values, the historical tag values, and deletes the buffer.`, async () => {
  const mqtt = Mqtt.instances[0]
  mqtt.connect()
  await mqtt.publish()
  expect(mockSparkplug.publishDeviceData).toBeCalledTimes(2)
})
test(`Tag: scan calls tag.source.read for each tag with a source and mqttSource.log`, async () => {
  spyOn(ModbusSource.prototype, 'read')
  spyOn(MqttSource.prototype, 'log')
  await ScanClass.instances[0].scan()
  expect(ModbusSource.prototype.read).toBeCalledTimes(
    ScanClass.instances[0].tags.filter((tag) => tag.source).length
  )
  expect(MqttSource.prototype.log).toBeCalledTimes(MqttSource.instances.length)
})
