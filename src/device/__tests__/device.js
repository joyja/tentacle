jest.mock(`modbus-serial`)
const ModbusRTU = require(`modbus-serial`)

const { createTestDb, deleteTestDb } = require('../../../test/db')
const {
  ScanClass,
  Tag,
  User,
  Device,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource
} = require('../../relations')
const fromUnixTime = require('date-fns/fromUnixTime')

const dbFilename = `test-device-spread-edge.db`
const pubsub = {}
let db = undefined
beforeAll(async () => {
  db = await createTestDb(dbFilename).catch((error) => {
    throw error
  })
  await User.initialize(db, pubsub).catch((error) => {
    throw error
  })
  await Tag.initialize(db, pubsub).catch((error) => {
    throw error
  })
})

afterAll(async () => {
  await deleteTestDb(db).catch((error) => {
    throw error
  })
})

test(`Initializing Device, also initializes Modbus, ModbusSource and EthernetIP.`, async () => {
  await Device.initialize(db, pubsub)
  expect(Device.initialized).toBe(true)
  expect(Modbus.initialized).toBe(true)
  expect(ModbusSource.initialized).toBe(true)
  expect(EthernetIP.initialized).toBe(true)
  expect(EthernetIPSource.initialized).toBe(true)
})
let device = null
test(`Modbus: create creates a device with modbus config`, async () => {
  await User.initialize(db, pubsub)
  user = User.instances[0]
  const name = `testDevice`
  const description = `Test Device`
  const host = `localhost`
  const port = 502
  const reverseBits = true
  const reverseWords = true
  const zeroBased = true
  const createdBy = user.id
  const modbus = await Modbus.create(
    name,
    description,
    host,
    port,
    reverseBits,
    reverseWords,
    zeroBased,
    createdBy
  )
  device = modbus.device
  expect(modbus.device).toBe(Device.instances[0])
  expect(modbus.device.name).toBe(name)
  expect(modbus.device.description).toBe(description)
  expect(modbus.host).toBe(host)
  expect(modbus.port).toBe(port)
  expect(modbus.reverseBits).toBe(reverseBits)
  expect(modbus.reverseWords).toBe(reverseWords)
  expect(modbus.zeroBased).toBe(zeroBased)
  expect(modbus.device.createdBy.id).toBe(user.id)
})
describe(`Device: `, () => {
  test(`check that init sets the appropriate underscore fields.`, async () => {
    Device.instances = []
    const uninitDevice = new Device(device.id)
    await uninitDevice.init()
    expect(uninitDevice._name).toBe(device._name)
    expect(uninitDevice._description).toBe(device._description)
    expect(uninitDevice._type).toBe(device._type)
    expect(uninitDevice._createdBy).toBe(device._createdBy)
    expect(uninitDevice._CreatedOn).toBe(device._CreatedOn)
    expect(uninitDevice._config).toBe(device._config)
    await Device.getAll()
  })
  test(`Getters all return their underscore values`, () => {
    expect(device.name).toBe(device._name)
    expect(device.description).toBe(device._description)
    expect(device.type).toBe(device._type)
    expect(device.createdBy.id).toBe(device._createdBy)
    expect(device.createdOn).toStrictEqual(fromUnixTime(device._createdOn))
  })
  test(`Setters all set the values appropriately`, async () => {
    const name = `newName`
    const description = `New description`
    await device.setName(name)
    await device.setDescription(description)
    expect(device.name).toBe(name)
    expect(device.description).toBe(description)
  })
})

// ==============================
//          Modbus
// ==============================

describe(`Modbus: `, () => {
  let modbus = null
  test(`Instantiating a modbus client creats a new ModbusRTU client`, () => {
    const modbusId = device.config.id
    Modbus.instances = []
    modbus = new Modbus(modbusId)
    expect(ModbusRTU).toHaveBeenCalledTimes(2)
    expect(modbus.client.constructor.name).toBe(`ModbusRTU`)
  })
  test(`check that init sets the appropriate underscore fields.`, async () => {
    await modbus.init()
    expect(modbus._device).toBe(device.config._device)
    expect(modbus._host).toBe(device.config._host)
    expect(modbus._port).toBe(device.config._port)
    expect(modbus._reverseBits).toBe(device.config._reverseBits)
    expect(modbus._reverseWords).toBe(device.config._reverseWords)
    expect(modbus._zeroBased).toBe(device.config._zeroBased)
    expect(modbus.client.getTimeout()).toBe(device.config.client.getTimeout())
    expect(modbus.connected).toBe(false)
    expect(modbus.error).toBe(null)
    await Modbus.getAll()
  })
  test(`Connect calls connectTCP and rejected results in a false connected status.`, async () => {
    modbus.client.connectTCP.mockRejectedValueOnce(
      new Error(`Connection Error.`)
    )
    await modbus.connect()
    expect(modbus.error).toMatchInlineSnapshot(`"Connection Error."`)
    expect(modbus.client.connectTCP).toBeCalledTimes(1)
    expect(modbus.connected).toBe(false)
    modbus.client.connectTCP.mockReset()
  })
  test(`Connect calls connectTCP and resolved results in a true connected status.`, async () => {
    modbus.client.connectTCP.mockResolvedValueOnce({})
    await modbus.connect()
    expect(modbus.error).toBe(null)
    expect(modbus.client.connectTCP).toBeCalledTimes(1)
    expect(modbus.connected).toBe(true)
    modbus.client.connectTCP.mockReset()
  })
  test(`Disconnect calls client close throws an error on reject.`, async () => {
    modbus.client.close.mockImplementation(() => {
      throw new Error(`Close connection failed.`)
    })
    expect(await modbus.disconnect().catch((e) => e)).toMatchInlineSnapshot(
      `[Error: Close connection failed.]`
    )
    expect(modbus.client.close).toBeCalledTimes(1)
    expect(modbus.connected).toBe(true)
    modbus.client.close.mockClear()
  })
  test(`Disconnect calls client close and throws an`, async () => {
    modbus.client.close.mockImplementation((callback) => {
      callback()
    })
    await modbus.disconnect()
    expect(modbus.client.close).toBeCalledTimes(1)
    expect(modbus.connected).toBe(false)
    modbus.client.close.mockClear()
  })
  test(`Getters all return their underscore values`, () => {
    expect(modbus.host).toBe(modbus._host)
    expect(modbus.port).toBe(modbus._port)
    expect(modbus.reverseBits).toBe(Boolean(modbus._reverseBits))
    expect(modbus.reverseWords).toBe(Boolean(modbus._reverseWords))
  })
  test(`Setters all set the values appropriately`, async () => {
    const host = `newHost`
    const port = 12345
    const reverseBits = true
    const reverseWords = true
    await modbus.setHost(host)
    await modbus.setPort(port)
    await modbus.setReverseBits(reverseBits)
    await modbus.setReverseWords(reverseWords)
    expect(modbus.host).toBe(host)
    expect(modbus.port).toBe(port)
    expect(modbus.reverseBits).toBe(reverseBits)
    expect(modbus.reverseWords).toBe(reverseWords)
  })
  test(`Get timeout calls modbus-serial client getTimeout.`, () => {
    modbus.client.getTimeout.mockReset()
    modbus.client.getTimeout.mockReturnValueOnce(modbus._timeout)
    expect(modbus.timeout).toBe(modbus._timeout)
    expect(modbus.client.getTimeout).toBeCalledTimes(1)
  })
  test(`If modbus.connected returns connected`, () => {
    modbus.connected = true
    expect(modbus.status).toBe(`connected`)
  })
  test(`If modbus.connected returns connected`, () => {
    modbus.connected = false
    modbus.error = `There's an error`
    expect(modbus.status).toBe(modbus.error)
  })
  test(`If not connected and no error, status is connecting`, () => {
    modbus.connected = false
    modbus.error = null
    expect(modbus.status).toBe(`connecting`)
  })
})
Modbus.instances = []

let scanClass = undefined
describe(`Modbus Source: `, () => {
  test(`Create creates instance and adds to Modbus.sources.`, async () => {
    await ScanClass.initialize(db, pubsub).catch((error) => {
      throw error
    })
    await Tag.initialize(db, pubsub).catch((error) => {
      throw error
    })
    const modbus = Modbus.instances[0]
    const user = User.instances[0]
    scanClass = await ScanClass.create(1000, user)
    const tag = await Tag.create(
      'testTag',
      'Test Tag',
      0,
      scanClass,
      user,
      `FLOAT`
    )
    const modbusSource = await ModbusSource.create(
      modbus.id,
      tag.id,
      1234,
      'INPUT_REGISTER'
    )
    expect(ModbusSource.instances[0].id).toBe(modbusSource.id)
    expect(modbus.sources[0].id).toBe(modbusSource.id)
  })
  let modbusSource = null
  test(`check that init sets the appropriate underscore fields.`, async () => {
    const id = ModbusSource.instances[0].id
    const modbusId = ModbusSource.instances[0]._modbus
    const tagId = ModbusSource.instances[0]._tag
    const register = ModbusSource.instances[0]._register
    const registerType = ModbusSource.instances[0]._registerType
    ModbusSource.instances = []
    modbusSource = new ModbusSource(id)
    await modbusSource.init()
    expect(modbusSource._modbus).toBe(modbusId)
    expect(modbusSource._tag).toBe(tagId)
    expect(modbusSource._register).toBe(register)
    expect(modbusSource._registerType).toBe(registerType)
    await ModbusSource.getAll()
  })
  test.todo(`Test formatValue`)
  test.todo(`Test read`)
  test(`Getters all return their underscore values`, () => {
    expect(modbusSource.register).toBe(modbusSource._register)
    expect(modbusSource.registerType).toBe(modbusSource._registerType)
  })
  test(`Setters all set the values appropriately`, async () => {
    const register = 54321
    const registerType = `INT32`
    await modbusSource.setRegister(register)
    await modbusSource.setRegisterType(registerType)
    expect(modbusSource.register).toBe(register)
    expect(modbusSource.registerType).toBe(registerType)
  })
})

// ==============================
//          Ethernet/IP
// ==============================

let ethernetip = undefined
describe(`EthernetIP :`, () => {
  test(`create creates a device with ethernetip config`, async () => {
    await User.initialize(db, pubsub)
    user = User.instances[0]
    const name = `testDevice`
    const description = `Test Device`
    const host = `localhost`
    const slot = 3
    const createdBy = user.id
    ethernetip = await EthernetIP.create(
      name,
      description,
      host,
      slot,
      createdBy
    )
    device = ethernetip.device
    expect(ethernetip.device).toBe(Device.instances[1])
    expect(ethernetip.device.name).toBe(name)
    expect(ethernetip.device.description).toBe(description)
    expect(ethernetip.host).toBe(host)
    expect(ethernetip.slot).toBe(slot)
    expect(ethernetip.device.createdBy.id).toBe(user.id)
    expect(ethernetip.client.constructor.name).toBe('Controller')
  })
  test.todo(`rewrite connect tests to mock ethernet-ip module.`)
  test(`connect connects`, async () => {
    await ethernetip.connect().catch((e) => {
      throw e
    })
    expect(ethernetip.connected).toBe(true)
  })
  test.todo(`rewrite disconnect tests to mock ethernet-ip module.`)
  test(`disconnect disconnects`, async () => {
    await ethernetip.disconnect().catch((e) => {
      throw e
    })
    expect(ethernetip.connected).toBe(false)
  })
})

describe(`EthernetIPSource: `, () => {
  let ethernetipSource = undefined
  test.todo(`rewrite read tests to mock ethernet-ip module.`)
  test(`read reads`, async () => {
    await ethernetip.connect()
    const tag = await Tag.create(
      'testEthernetIP',
      'Test Ethernet IP Tag',
      0,
      scanClass,
      user,
      `FLOAT`
    )
    ethernetipSource = await EthernetIPSource.create(
      ethernetip.id,
      tag.id,
      'RTU25A_7XFR5_FIT_001.VALUE'
    )
    await ethernetipSource.read()
    expect(tag.value).toBeGreaterThan(0)
  })
  test(`Getters all return their underscore values`, () => {
    expect(ethernetipSource.tagname).toBe(ethernetipSource._tagname)
  })
  test(`Setters all set the values appropriately`, async () => {
    const tagname = `ADifferentTag`
    await ethernetipSource.setTagname(tagname)
    expect(ethernetipSource.tagname).toBe(tagname)
  })
})
