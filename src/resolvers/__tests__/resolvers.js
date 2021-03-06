jest.mock(`tentacle-sparkplug-client`)
jest.mock(`modbus-serial`)
jest.mock(`ethernet-ip`)
jest.mock(`apollo-server-express`)
jest.mock(`node-opcua`, () => {
  return {
    OPCUAClient: {
      create: () => {
        return {
          connect: jest.fn(async () => {}),
          disconnect: jest.fn(),
          on: jest.fn(),
          createSession: jest.fn(() => {
            return {
              readVariableValue: jest.fn(),
              writeSingleNode: jest.fn(),
              close: jest.fn(),
            }
          }),
        }
      },
    },
    MessageSecurityMode: { None: null },
    SecurityPolicy: { None: null },
    DataType: {
      Boolean: 1,
      Float: 2,
      Int32: 3,
      String: 4,
    },
  }
})
const { PubSub } = require(`apollo-server-express`)
const ModbusRTU = require(`modbus-serial`)
const { Controller } = require(`ethernet-ip`)
const sparkplug = require(`tentacle-sparkplug-client`)

const { createTestDb, deleteTestDb } = require('../../../test/db')
const {
  User,
  ScanClass,
  Tag,
  Device,
  Modbus,
  ModbusSource,
  EthernetIP,
  EthernetIPSource,
  Opcua,
  OpcuaSource,
  Service,
  Mqtt,
  MqttSource,
} = require('../../relations')
const mockSparkplug = {
  on: jest.fn((state, callback) => {
    if (state === 'birth') {
      callback()
    }
  }),
  publishNodeBirth: jest.fn(),
  publishDeviceBirth: jest.fn(),
  publishDeviceData: jest.fn(),
  publishDeviceDeath: jest.fn(),
  stop: jest.fn(),
  on: jest.fn(),
  subscribePrimaryHost: jest.fn(),
}
const bcrypt = require('bcryptjs')

const resolvers = require('../index')

const dbFilename = `test-resolvers-spread-edge.db`

let db = undefined
let user = undefined
const pubsub = {
  publish: jest.fn(),
  asyncIterator: jest.fn(),
}
let context = {
  pubsub,
}
let unauthorizedContext = {}

beforeAll(async () => {
  ModbusRTU.prototype.connectTCP.mockResolvedValue({})
  ModbusRTU.prototype.close.mockImplementation((callback) => {
    callback()
  })
  Controller.prototype.connect.mockResolvedValue({})
  Controller.prototype.destroy.mockResolvedValue({})
  Controller.prototype.readTag.mockImplementation(async (tagData) => {
    return new Promise((resolve, reject) => {
      tagData.value = 123.456
      resolve()
    })
  })
  sparkplug.newClient.mockImplementation(() => {
    return mockSparkplug
  })
  db = await createTestDb().catch((error) => {
    throw error
  })
  await User.initialize(db, pubsub).catch((error) => {
    throw error
  })
  await ScanClass.initialize(db, pubsub).catch((error) => {
    throw error
  })
  await Tag.initialize(db, pubsub).catch((error) => {
    throw error
  })
  await Device.initialize(db, pubsub).catch((error) => {
    throw error
  })
  await Service.initialize(db, pubsub).catch((error) => {
    throw error
  })
  user = User.instances[0]
  const { token } = await User.login(user.username, `password`)
  context.req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  }
  unauthorizedContext.req = {
    headers: {},
  }
  context.scanClasses = ScanClass.instances
  context.tags = Tag.instances
  context.devices = Device.instances
  context.services = Service.instances
  unauthorizedContext.scanClasses = ScanClass.instances
  unauthorizedContext.tags = Tag.instances
  unauthorizedContext.devices = Device.instances
  unauthorizedContext.services = Service.instances
  const scanClass = await ScanClass.create(1000, user.id)
  await ScanClass.create(2000, user.id)
  await Tag.create(
    `testTag1`,
    `Test Tag 1`,
    123,
    scanClass.id,
    user.id,
    'FLOAT'
  ).catch((error) => {
    throw error
  })
  await Modbus.create(
    `testModbusDevice1`,
    `Test Modbus Device 1`,
    'localhost',
    502,
    true,
    true,
    true,
    user.id
  ).catch((error) => {
    throw error
  })
  await EthernetIP.create(
    `testeipDevice1`,
    `Test EIP Device 1`,
    'localhost',
    3,
    user.id
  ).catch((error) => {
    throw error
  })
  await Opcua.create(
    'testopcuaDevice1',
    'Test OPCUA Device 1',
    'localhost',
    4840,
    30000,
    user.id
  ).catch((error) => {
    throw error
  })
})

afterAll(async () => {
  ModbusRTU.prototype.connectTCP.mockClear()
  ModbusRTU.prototype.close.mockClear()
  Controller.prototype.connect.mockClear()
  Controller.prototype.destroy.mockClear()
  Controller.prototype.readTag.mockClear()
  await deleteTestDb(db).catch((error) => {
    throw error
  })
})

afterEach(async () => {
  jest.clearAllMocks()
})

// ==============================
//          Queries
// ==============================

describe('Query :', () => {
  test(`scanClasses returns all scan class instances`, async () => {
    expect(await resolvers.Query.scanClasses({}, {}, context, {})).toBe(
      ScanClass.instances
    )
  })
  test(`scanClasses returns error on invalid request instances`, async () => {
    expect(
      await resolvers.Query.scanClasses({}, {}, unauthorizedContext, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: You are not authorized.]`)
  })
  test(`tags returns all tag instances`, async () => {
    expect(await resolvers.Query.tags({}, {}, context, {})).toBe(Tag.instances)
  })
  test(`tags returns error on invalid request instances`, async () => {
    expect(
      await resolvers.Query.tags({}, {}, unauthorizedContext, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: You are not authorized.]`)
  })
  test(`device returns all device instances`, async () => {
    expect(await resolvers.Query.devices({}, {}, context, {})).toBe(
      Device.instances
    )
  })
  test(`devices returns error on invalid request instances`, async () => {
    expect(
      await resolvers.Query.devices({}, {}, unauthorizedContext, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: You are not authorized.]`)
  })
  test(`services returns all service instances`, async () => {
    expect(await resolvers.Query.services({}, {}, context, {})).toBe(
      Service.instances
    )
  })
  test(`services returns error on invalid request instances`, async () => {
    expect(
      await resolvers.Query.services({}, {}, unauthorizedContext, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: You are not authorized.]`)
  })
})

// ==============================
//          Mutations
// ==============================

describe(`Mutations: `, () => {
  test(`login returns the appropriate payload`, async () => {
    args = {
      username: user.username,
      password: 'password',
    }
    const payload = await resolvers.Mutation.login({}, args, context, {}).catch(
      (error) => {
        throw error
      }
    )
    expect(payload).toEqual({
      token: expect.any(String),
      user,
    })
  })
  test(`login with incorrect username causes an error.`, async () => {
    args = {
      username: `bogusUsername`,
      password: 'password',
    }
    expect(
      await resolvers.Mutation.login({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`login with incorrect password causes an error.`, async () => {
    args = {
      username: user.username,
      password: 'bogusPassword',
    }
    expect(
      await resolvers.Mutation.login({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`changePassword changes the password`, async () => {
    args = {
      newPassword: `aNewPassword`,
      oldPassword: `password`,
    }
    const changedUser = await resolvers.Mutation.changePassword(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(await bcrypt.compare(args.newPassword, user.password)).toBe(true)
    expect(changedUser).toBe(user)
  })
  let scanClass = undefined
  test(`createScanClass creates a scan class with the selected settings.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      rate: 1000,
    }
    scanClass = await resolvers.Mutation.createScanClass(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ScanClass.instances.length).toBe(prevCount + 1)
    expect(scanClass.rate).toBe(args.rate)
  })
  test(`updateScanClass updates a scan class with the selected settings.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: scanClass.id,
      rate: 2000,
    }
    updatedScanClass = await resolvers.Mutation.updateScanClass(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    await updatedScanClass.stopScan()
    expect(ScanClass.instances.length).toBe(prevCount)
    expect(updatedScanClass.rate).toBe(args.rate)
  })
  test(`updateScanClass updates a scan class with the selected settings.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: scanClass.id,
    }
    updatedScanClass = await resolvers.Mutation.updateScanClass(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    await updatedScanClass.stopScan()
    expect(ScanClass.instances.length).toBe(prevCount)
  })
  test(`updateScanClass throws error on invalid ID.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: 1234567,
      rate: 2000,
    }
    expect(
      await resolvers.Mutation.updateScanClass({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(
      `[Error: Scan Class with id 1234567 does not exist.]`
    )
    expect(ScanClass.instances.length).toBe(prevCount)
  })
  test(`deleteScanClass with invalid id throws error.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteScanClass({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(
      `[Error: Scan Class with id 1234567 does not exist.]`
    )
    expect(ScanClass.instances.length).toBe(prevCount)
  })
  test(`deleteScanClass deletes a scan class.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: scanClass.id,
    }
    const deletedScanClass = await resolvers.Mutation.deleteScanClass(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ScanClass.instances.length).toBe(prevCount - 1)
    expect(deletedScanClass.id).toBe(args.id)
  })
  let tag = undefined
  test(`createTag creates a scan class with the selected settings.`, async () => {
    prevCount = Tag.instances.length
    const args = {
      name: `TestTag`,
      description: `Test Tag`,
      value: 123,
      scanClassId: ScanClass.instances[0].id,
    }
    tag = await resolvers.Mutation.createTag({}, args, context, {}).catch(
      (error) => {
        throw error
      }
    )
    expect(Tag.instances.length).toBe(prevCount + 1)
  })
  test(`updateTag updates a scan class with the selected settings.`, async () => {
    prevCount = Tag.instances.length
    const args = {
      id: tag.id,
      name: `TagWithNewName`,
      description: `Test Tag with different description`,
      value: 321,
      deadband: 1,
      scanClassId: ScanClass.instances[1].id,
    }
    updatedTag = await resolvers.Mutation.updateTag(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Tag.instances.length).toBe(prevCount)
  })
  test(`updateTag without args (other than id still completes successfully).`, async () => {
    prevCount = Tag.instances.length
    const args = {
      id: tag.id,
    }
    updatedTag = await resolvers.Mutation.updateTag(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Tag.instances.length).toBe(prevCount)
  })
  test(`updateTag updates with invalid id throws an error.`, async () => {
    prevCount = Tag.instances.length
    const args = {
      id: 1234567,
      name: `TagWithNewName`,
      description: `Test Tag with different description`,
      value: 321,
      scanClassId: ScanClass.instances[1].id,
    }
    expect(
      await resolvers.Mutation.updateTag({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
    expect(Tag.instances.length).toBe(prevCount)
  })
  test(`deleteTag deletes a scan class.`, async () => {
    prevCount = Tag.instances.length
    const args = {
      id: tag.id,
    }
    const deletedTag = await resolvers.Mutation.deleteTag(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Tag.instances.length).toBe(prevCount - 1)
    expect(deletedTag.id).toBe(args.id)
  })
  test(`deleteTag with invalid id throws an error.`, async () => {
    prevCount = Tag.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteTag({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
    expect(Tag.instances.length).toBe(prevCount)
  })
  let device = undefined
  test(`createModbus creates a modbus device with the selected settings.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      name: `resolverTestModbus`,
      description: `Resolver Test Modbus`,
      host: 'localhost',
      port: 502,
      reverseBits: true,
      reverseWords: true,
      zeroBased: true,
    }
    device = await resolvers.Mutation.createModbus({}, args, context, {})
    expect(Modbus.instances.length).toBe(prevCount + 1)
    expect(device.name).toBe(args.name)
    expect(device.description).toBe(args.description)
    expect(device.config.host).toBe(args.host)
    expect(device.config.port).toBe(args.port)
    expect(device.config.reverseBits).toBe(args.reverseBits)
    expect(device.config.reversWords).toBe(args.reversWords)
    expect(device.config.zeroBased).toBe(args.zeroBased)
  })
  test(`updateModbus updates a modbus device with the selected settings.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: device.id,
      name: `resolverTestModbusUpdated`,
      description: `Resolver Test Modbus Updated`,
      host: '192.168.1.123',
      port: 503,
      reverseBits: false,
      reverseWords: false,
      zeroBased: false,
    }
    const updatedDevice = await resolvers.Mutation.updateModbus(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Modbus.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
    expect(updatedDevice.name).toBe(args.name)
    expect(updatedDevice.description).toBe(args.description)
    expect(updatedDevice.config.host).toBe(args.host)
    expect(updatedDevice.config.port).toBe(args.port)
    expect(updatedDevice.config.reverseBits).toBe(args.reverseBits)
    expect(updatedDevice.config.reversWords).toBe(args.reversWords)
    expect(updatedDevice.config.zeroBased).toBe(args.zeroBased)
  })
  test(`updateModbus updates a modbus device with the selected settings.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: device.id,
    }
    const updatedDevice = await resolvers.Mutation.updateModbus(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Modbus.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
  })
  test(`updateModbus with invalid id throws error.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateModbus({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
    expect(Modbus.instances.length).toBe(prevCount)
  })
  test(`deleteModbus deletes a modbus device with the selected settings.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: device.id,
    }
    const deletedDevice = await resolvers.Mutation.deleteModbus(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Modbus.instances.length).toBe(prevCount - 1)
    expect(deletedDevice.id).toBe(args.id)
  })
  test(`deleteModbus with invalid id throws error.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteModbus({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
    expect(Modbus.instances.length).toBe(prevCount)
  })
  test(`createModbusSource creates a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      deviceId: Modbus.instances[0].device.id,
      tagId: Tag.instances[0].id,
      register: 12345,
      registerType: `BOOLEAN`,
    }
    modbusSource = await resolvers.Mutation.createModbusSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ModbusSource.instances.length).toBe(prevCount + 1)
    expect(modbusSource.modbus.device).toBe(Modbus.instances[0].device)
    expect(modbusSource.tag).toBe(Tag.instances[0])
    expect(modbusSource.register).toBe(args.register)
    expect(modbusSource.registerType).toBe(args.registerType)
  })
  test(`Source resolver returns it's parents type`, async () => {
    expect(await resolvers.Source.__resolveType(modbusSource)).toBe(
      `ModbusSource`
    )
  })
  test(`createModbusSource creates with invalid tag id throws error.`, async () => {
    const args = {
      deviceId: Modbus.instances[0].device.id,
      tagId: 1234567,
      register: 12345,
      registerType: `BOOLEAN`,
    }
    expect(
      await resolvers.Mutation.createModbusSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: There is no tag with id 1234567]`)
  })
  test(`createModbusSource creates with invalid device id throws error.`, async () => {
    const args = {
      deviceId: 1234567,
      tagId: Tag.instances[0].id,
      register: 12345,
      registerType: `BOOLEAN`,
    }
    expect(
      await resolvers.Mutation.createModbusSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: There is no device with id 1234567]`)
  })
  test(`Source resolver returns it's parents type`, async () => {
    expect(await resolvers.Source.__resolveType(modbusSource)).toBe(
      `ModbusSource`
    )
  })
  test(`createModbusSource with the id of a service that isn't modbus throws an error.`, async () => {
    const nonModbusDevice = await Device.create(
      `aDevice`,
      `A device`,
      `notEthernetIP`,
      User.instances[0].id
    )
    const args = {
      deviceId: nonModbusDevice.id,
      tagId: Tag.instances[0].id,
      register: 12345,
      registerType: `BOOLEAN`,
    }
    expect(
      await resolvers.Mutation.createModbusSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(
      `[Error: The device named aDevice is not a modbus device.]`
    )
  })
  test(`Source resolver returns it's parents type`, async () => {
    expect(await resolvers.Source.__resolveType(modbusSource)).toBe(
      `ModbusSource`
    )
  })
  test(`DeviceConfig resolver type returns the type of the parent`, async () => {
    expect(
      await resolvers.DeviceConfig.__resolveType(Modbus.instances[0])
    ).toBe(`Modbus`)
  })
  test(`updateModbusSource updates a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
      register: 45321,
      registerType: `FLOAT`,
    }
    const updatedModbusSource = await resolvers.Mutation.updateModbusSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ModbusSource.instances.length).toBe(prevCount)
    expect(updatedModbusSource.modbus.device).toBe(Modbus.instances[0].device)
    expect(updatedModbusSource.tag).toBe(Tag.instances[0])
    expect(updatedModbusSource.register).toBe(args.register)
    expect(updatedModbusSource.registerType).toBe(args.registerType)
  })
  test(`updateModbusSource updates a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const updatedModbusSource = await resolvers.Mutation.updateModbusSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ModbusSource.instances.length).toBe(prevCount)
  })
  test(`updateModbusSource with invalid id throws error.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      tagId: 1234567,
    }
    expect(
      await resolvers.Mutation.updateModbusSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
    expect(Modbus.instances.length).toBe(prevCount)
  })
  test(`deleteModbusSource deletes a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const deletedModbusSource = await resolvers.Mutation.deleteModbusSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(ModbusSource.instances.length).toBe(prevCount - 1)
    expect(deletedModbusSource.id).toBe(args.tagId)
  })
  test(`deleteModbusSource with invalid id throws error.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      tagId: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteModbusSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
    expect(Modbus.instances.length).toBe(prevCount)
  })
  test(`createEthernetIP creates a ethernetip device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      name: `resolverTestEthernetIP`,
      description: `Resolver Test EthernetIP`,
      host: 'localhost',
      slot: 0,
    }
    device = await resolvers.Mutation.createEthernetIP(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIP.instances.length).toBe(prevCount + 1)
    expect(device.name).toBe(args.name)
    expect(device.description).toBe(args.description)
    expect(device.config.host).toBe(args.host)
    expect(device.config.slot).toBe(args.slot)
  })
  test(`updateEthernetIP updates a ethernetip device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: device.id,
      name: `resolverTestEthernetIPUpdated`,
      description: `Resolver Test EthernetIP Updated`,
      host: '192.168.1.123',
      slot: 3,
    }
    const updatedDevice = await resolvers.Mutation.updateEthernetIP(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIP.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
    expect(updatedDevice.name).toBe(args.name)
    expect(updatedDevice.description).toBe(args.description)
    expect(updatedDevice.config.host).toBe(args.host)
    expect(updatedDevice.config.slot)
  })
  test(`updateEthernetIP without arguments is valid.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: device.id,
    }
    const updatedDevice = await resolvers.Mutation.updateEthernetIP(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIP.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
  })
  test(`updateEthernetIP with invalid id throws error.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateEthernetIP({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
  })
  test(`deleteEthernetIP deletes a ethernetip device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: device.id,
    }
    const deletedDevice = await resolvers.Mutation.deleteEthernetIP(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIP.instances.length).toBe(prevCount - 1)
    expect(deletedDevice.id).toBe(args.id)
  })
  test(`deleteEthernetIP with invalid id throws error.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteEthernetIP({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
  })
  let ethernetipSource = undefined
  test(`createEthernetIPSource with invalid tag ID throws error.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      deviceId: EthernetIP.instances[0].device.id,
      tagId: 1234567,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createEthernetIPSource(
        {},
        args,
        context,
        {}
      ).catch((error) => error)
    ).toMatchInlineSnapshot(`[Error: There is no tag with id 1234567]`)
    expect(EthernetIPSource.instances.length).toBe(prevCount)
  })
  test(`createEthernetIPSource with invalid device ID throws error.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      deviceId: 1234567,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createEthernetIPSource(
        {},
        args,
        context,
        {}
      ).catch((error) => error)
    ).toMatchInlineSnapshot(`[Error: There is no device with id 1234567]`)
    expect(EthernetIPSource.instances.length).toBe(prevCount)
  })
  test(`createEthernetIPSource with invalid device ID throws error.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const nonEthernetIPDevice = await Device.create(
      'aDevice',
      'aDescription',
      'notEthernetIP',
      User.instances[0].id
    )
    const args = {
      deviceId: nonEthernetIPDevice.id,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createEthernetIPSource(
        {},
        args,
        context,
        {}
      ).catch((error) => error)
    ).toMatchInlineSnapshot(
      `[Error: The device named aDevice is not an ethernetip device.]`
    )
    expect(EthernetIPSource.instances.length).toBe(prevCount)
  })
  test(`createEthernetIPSource creates a ethernetip source with the selected settings.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      deviceId: EthernetIP.instances[0].device.id,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`,
    }
    ethernetipSource = await resolvers.Mutation.createEthernetIPSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIPSource.instances.length).toBe(prevCount + 1)
    expect(ethernetipSource.ethernetip.device).toBe(
      EthernetIP.instances[0].device
    )
    expect(ethernetipSource.tag).toBe(Tag.instances[0])
    expect(ethernetipSource.tagname).toBe(args.tagname)
  })
  test(`updateEthernetIPSource updates a ethernetip source with the selected settings.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
      tagname: `aDifferentTagname`,
    }
    const updatedEthernetIPSource = await resolvers.Mutation.updateEthernetIPSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIPSource.instances.length).toBe(prevCount)
    expect(updatedEthernetIPSource.ethernetip.device).toBe(
      EthernetIP.instances[0].device
    )
    expect(updatedEthernetIPSource.tag).toBe(Tag.instances[0])
    expect(updatedEthernetIPSource.tagname).toBe(args.tagname)
  })
  test(`updateEthernetIPSource update without args still works.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const updatedEthernetIPSource = await resolvers.Mutation.updateEthernetIPSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIPSource.instances.length).toBe(prevCount)
    expect(updatedEthernetIPSource.ethernetip.device).toBe(
      EthernetIP.instances[0].device
    )
  })
  test(`updateEthernetIPSource with invalid id throws error.`, async () => {
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateEthernetIPSource(
        {},
        args,
        context,
        {}
      ).catch((error) => error)
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
  })
  test(`Source resolver returns it's parents type`, async () => {
    expect(await resolvers.Source.__resolveType(ethernetipSource)).toBe(
      `EthernetIPSource`
    )
  })
  test(`DeviceConfig resolver type returns the type of the parent`, async () => {
    expect(
      await resolvers.DeviceConfig.__resolveType(EthernetIP.instances[0])
    ).toBe(`EthernetIP`)
  })
  test(`deleteEthernetIP deletes a modbus device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const deletedEthernetIPSource = await resolvers.Mutation.deleteEthernetIPSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(EthernetIPSource.instances.length).toBe(prevCount - 1)
    expect(deletedEthernetIPSource.id).toBe(args.tagId)
  })
  test(`deleteEthernetIPSource with invalid id throws error.`, async () => {
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteEthernetIPSource(
        {},
        args,
        context,
        {}
      ).catch((error) => error)
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
  })
  test(`createOpcua creates an OPCUA device with the selected settings.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      name: `resolverTestOpcua`,
      description: `Resolver Test Opcua`,
      host: 'localhost',
      port: 4840,
      retryRate: 30000,
    }
    device = await resolvers.Mutation.createOpcua({}, args, context, {}).catch(
      (error) => {
        throw error
      }
    )
    expect(Opcua.instances.length).toBe(prevCount + 1)
    expect(device.name).toBe(args.name)
    expect(device.description).toBe(args.description)
    expect(device.config.host).toBe(args.host)
    expect(device.config.port).toBe(args.port)
  })
  test(`updateOpcua updates a ethernetip device with the selected settings.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      id: device.id,
      name: `resolverTestOpcuaUpdated`,
      description: `Resolver Test Opcua Updated`,
      host: '192.168.1.123',
      port: 3,
      retryRate: 15000,
    }
    const updatedDevice = await resolvers.Mutation.updateOpcua(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Opcua.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
    expect(updatedDevice.name).toBe(args.name)
    expect(updatedDevice.description).toBe(args.description)
    expect(updatedDevice.config.host).toBe(args.host)
    expect(updatedDevice.config.port).toBe(args.port)
    expect(updatedDevice.config.retryRate).toBe(args.retryRate)
  })
  test(`updateOpcua without arguments is valid.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      id: device.id,
    }
    const updatedDevice = await resolvers.Mutation.updateOpcua(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Opcua.instances.length).toBe(prevCount)
    expect(updatedDevice.id).toBe(args.id)
  })
  test(`updateOpcua with invalid id throws error.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateOpcua({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
  })
  test(`deleteOpcua deletes a ethernetip device with the selected settings.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      id: device.id,
    }
    const deletedDevice = await resolvers.Mutation.deleteOpcua(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Opcua.instances.length).toBe(prevCount - 1)
    expect(deletedDevice.id).toBe(args.id)
  })
  test(`deleteOpcua with invalid id throws error.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteOpcua({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Device with id 1234567 does not exist.]`)
  })
  let opcuaSource = undefined
  test(`createOpcuaSource with invalid tag ID throws error.`, async () => {
    prevCount = OpcuaSource.instances.length
    const args = {
      deviceId: Opcua.instances[0].device.id,
      tagId: 1234567,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createOpcuaSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: There is no tag with id 1234567]`)
    expect(OpcuaSource.instances.length).toBe(prevCount)
  })
  test(`createOpcuaSource with invalid device ID throws error.`, async () => {
    prevCount = OpcuaSource.instances.length
    const args = {
      deviceId: 1234567,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createOpcuaSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: There is no device with id 1234567]`)
    expect(OpcuaSource.instances.length).toBe(prevCount)
  })
  test(`createOpcuaSource with invalid device ID throws error.`, async () => {
    prevCount = OpcuaSource.instances.length
    const nonOpcuaDevice = await Device.create(
      'aDevice',
      'aDescription',
      'notOpcua',
      User.instances[0].id
    )
    const args = {
      deviceId: nonOpcuaDevice.id,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`,
    }
    expect(
      await resolvers.Mutation.createOpcuaSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(
      `[Error: The device named aDevice is not an opcua device.]`
    )
    expect(OpcuaSource.instances.length).toBe(prevCount)
  })
  test(`createOpcuaSource creates a opcua source with the selected settings.`, async () => {
    prevCount = OpcuaSource.instances.length
    const args = {
      deviceId: Opcua.instances[0].device.id,
      tagId: Tag.instances[0].id,
      nodeId: `n1,s`,
    }
    opcuaSource = await resolvers.Mutation.createOpcuaSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(OpcuaSource.instances.length).toBe(prevCount + 1)
    expect(opcuaSource.opcua.device).toBe(Opcua.instances[0].device)
    expect(opcuaSource.tag).toBe(Tag.instances[0])
    expect(opcuaSource.nodeId).toBe(args.nodeId)
  })
  test(`updateOpcuaSource updates a opcua source with the selected settings.`, async () => {
    prevCount = OpcuaSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
      nodeId: `aDifferentNodeId`,
    }
    const updatedOpcuaSource = await resolvers.Mutation.updateOpcuaSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(OpcuaSource.instances.length).toBe(prevCount)
    expect(updatedOpcuaSource.opcua.device).toBe(Opcua.instances[0].device)
    expect(updatedOpcuaSource.tag).toBe(Tag.instances[0])
    expect(updatedOpcuaSource.nodeId).toBe(args.nodeId)
  })
  test(`updateOpcuaSource update without args still works.`, async () => {
    prevCount = OpcuaSource.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const updatedOpcuaSource = await resolvers.Mutation.updateOpcuaSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(OpcuaSource.instances.length).toBe(prevCount)
    expect(updatedOpcuaSource.opcua.device).toBe(Opcua.instances[0].device)
  })
  test(`updateOpcuaSource with invalid id throws error.`, async () => {
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateOpcuaSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
  })
  test(`Source resolver returns it's parents type`, async () => {
    expect(await resolvers.Source.__resolveType(opcuaSource)).toBe(
      `OpcuaSource`
    )
  })
  test(`DeviceConfig resolver type returns the type of the parent`, async () => {
    expect(await resolvers.DeviceConfig.__resolveType(Opcua.instances[0])).toBe(
      `Opcua`
    )
  })
  test(`deleteOpcua deletes a modbus device with the selected settings.`, async () => {
    prevCount = Opcua.instances.length
    const args = {
      tagId: Tag.instances[0].id,
    }
    const deletedOpcuaSource = await resolvers.Mutation.deleteOpcuaSource(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(OpcuaSource.instances.length).toBe(prevCount - 1)
    expect(deletedOpcuaSource.id).toBe(args.tagId)
  })
  test(`deleteOpcuaSource with invalid id throws error.`, async () => {
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteOpcuaSource({}, args, context, {}).catch(
        (error) => error
      )
    ).toMatchInlineSnapshot(`[Error: Tag with id 1234567 does not exist.]`)
  })
  let service = undefined
  test(`createMqtt creates a mqtt service with the selected settings.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      name: `AnMqttService`,
      description: `An MQTT Service`,
      host: `mqtt.jarautomation.io`,
      port: 31711,
      group: `aGroup`,
      node: `aNode`,
      username: `mqttUser`,
      password: `mqttPassword`,
      devices: [Device.instances[0].id],
      rate: 1000,
    }
    service = await resolvers.Mutation.createMqtt({}, args, context, {}).catch(
      (error) => {
        throw error
      }
    )
    expect(Mqtt.instances.length).toBe(prevCount + 1)
    expect(service.name).toBe(args.name)
    expect(service.description).toBe(args.description)
    expect(service.config.host).toBe(args.host)
    expect(service.config.port).toBe(args.port)
    expect(service.config.group).toBe(args.group)
    expect(service.config.node).toBe(args.node)
    expect(service.config.username).toBe(args.username)
    expect(service.config.password).toBe(args.password)
    expect(service.config.rate).toBe(args.rate)
    expect([service.config.sources[0].device]).toStrictEqual([
      Device.findById(args.devices[0]),
    ])
  })
  test(`updateMqtt updates a mqtt service with the selected settings.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: service.id,
      name: `ANewNamedMqtt`,
      description: `A new mqtt description`,
      host: `mqtt1.jarautomation.io`,
      port: 31712,
      group: `aDiffernetGroup`,
      node: `aDifferentNode`,
      username: `anotherMqttUser`,
      password: `anotherMqttPassword`,
      rate: 1000,
    }
    const updatedService = await resolvers.Mutation.updateMqtt(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Mqtt.instances.length).toBe(prevCount)
    expect(updatedService.name).toBe(args.name)
    expect(updatedService.description).toBe(args.description)
    expect(updatedService.config.host).toBe(args.host)
    expect(updatedService.config.port).toBe(args.port)
    expect(updatedService.config.group).toBe(args.group)
    expect(updatedService.config.node).toBe(args.node)
    expect(updatedService.config.username).toBe(args.username)
    expect(updatedService.config.password).toBe(args.password)
    expect(updatedService.config.rate).toBe(args.rate)
  })
  test(`updateMqtt without args still returns.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: service.id,
    }
    const updatedService = await resolvers.Mutation.updateMqtt(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Mqtt.instances.length).toBe(prevCount)
  })
  test(`updateMqtt with invalid id throws an error.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateMqtt({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(Mqtt.instances.length).toBe(prevCount)
  })
  test(`addMqttPrimaryHost with invalid id throws error.`, async () => {
    const prevLength = service.config.primaryHosts.length
    const args = {
      id: 1234567,
      name: 'yetAnotherPrimaryHost',
    }
    expect(
      await resolvers.Mutation.addMqttPrimaryHost({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(service.config.primaryHosts.length).toBe(prevLength)
    expect(
      service.config.primaryHosts.some((host) => host.name === args.name)
    ).toBe(false)
  })
  test(`addMqttPrimaryHost with valid id adds a primary host.`, async () => {
    const prevLength = service.config.primaryHosts.length
    const args = {
      id: service.id,
      name: 'yetAnotherPrimaryHost',
    }
    await resolvers.Mutation.addMqttPrimaryHost({}, args, context, {})
    expect(service.config.primaryHosts.length).toBe(prevLength + 1)
    expect(
      service.config.primaryHosts.some((host) => host.name === args.name)
    ).toBe(true)
  })
  test(`addMqttPrimaryHost with a service that isn't mqtt throws an error`, async () => {
    const nonMqttService = await Service.create(
      'aService',
      'aDescription',
      'notMqtt',
      User.instances[0].id
    )
    const args = {
      id: nonMqttService.id,
      name: 'yetAnotherPrimaryHost',
    }
    expect(
      await resolvers.Mutation.addMqttPrimaryHost({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(
      `[Error: Service with id 2 is not an mqtt service. It's type notMqtt]`
    )
  })
  test(`deleteMqttPrimaryHost with valid id and name deletes a primary host.`, async () => {
    const prevLength = service.config.primaryHosts.length
    const args = {
      id: 1234567,
      name: 'yetAnotherPrimaryHost',
    }
    expect(
      await resolvers.Mutation.deleteMqttPrimaryHost(
        {},
        args,
        context,
        {}
      ).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(service.config.primaryHosts.length).toBe(prevLength)
    expect(
      service.config.primaryHosts.some((host) => host.name === args.name)
    ).toBe(true)
  })
  test(`deleteMqttPrimaryHost with valid id and name deletes a primary host.`, async () => {
    const prevLength = service.config.primaryHosts.length
    const args = {
      id: service.id,
      name: 'yetAnotherPrimaryHost',
    }
    await resolvers.Mutation.deleteMqttPrimaryHost({}, args, context, {})
    expect(service.config.primaryHosts.length).toBe(prevLength - 1)
    expect(
      service.config.primaryHosts.some((host) => host.name === args.name)
    ).toBe(false)
  })
  test(`deleteMqttPrimaryHost with a service that isn't mqtt throws an error`, async () => {
    const nonMqttService = await Service.create(
      'aService',
      'aDescription',
      'notMqtt',
      User.instances[0].id
    )
    const args = {
      id: nonMqttService.id,
      name: 'yetAnotherPrimaryHost',
    }
    expect(
      await resolvers.Mutation.deleteMqttPrimaryHost(
        {},
        args,
        context,
        {}
      ).catch((e) => e)
    ).toMatchInlineSnapshot(
      `[Error: Service with id 3 is not an mqtt service. It's type notMqtt]`
    )
  })
  let mqtt = undefined
  test(`addMqttSource with invalid id throws error.`, async () => {
    mqtt = await Mqtt.create(
      'testMqtt',
      'Test Mqtt',
      'localhost',
      '1883',
      'group 1',
      'node 1',
      'username',
      'password',
      [],
      5000,
      false,
      250,
      user.id,
      []
    )
    const device = Device.instances[0]
    const prevLength = mqtt.service.config.sources.length
    const args = {
      id: 1234567,
      deviceId: device.id,
    }
    expect(
      await resolvers.Mutation.addMqttSource({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(mqtt.service.config.sources.length).toBe(prevLength)
    expect(
      mqtt.service.config.sources.some(
        (source) => source.device.id === device.id
      )
    ).toBe(false)
  })
  test(`addMqttSource with valid id adds an mqtt source.`, async () => {
    const device = Device.instances[0]
    const prevLength = mqtt.service.config.sources.length
    const args = {
      id: mqtt.service.id,
      deviceId: device.id,
    }
    await resolvers.Mutation.addMqttSource({}, args, context, {})
    expect(mqtt.service.config.sources.length).toBe(prevLength + 1)
    expect(
      mqtt.service.config.sources.some((host) => host.name === args.name)
    ).toBe(true)
  })
  test(`addMqttSource with a service that isn't mqtt throws an error`, async () => {
    const device = Device.instances[0]
    const nonMqttService = await Service.create(
      'aService',
      'aDescription',
      'notMqtt',
      User.instances[0].id
    )
    const args = {
      id: nonMqttService.id,
      deviceId: device.id,
    }
    expect(
      await resolvers.Mutation.addMqttSource({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(
      `[Error: Service with id 5 is not an mqtt service. It's type notMqtt]`
    )
  })
  test(`deleteMqttSource with valid id and name deletes a primary host.`, async () => {
    const device = Device.instances[0]
    const prevLength = service.config.sources.length
    const args = {
      id: 1234567,
      deviceId: device.id,
    }
    expect(
      await resolvers.Mutation.deleteMqttSource({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(mqtt.service.config.sources.length).toBe(prevLength)
    expect(
      mqtt.service.config.sources.some((host) => host.name === args.name)
    ).toBe(true)
  })
  test(`deleteMqttSource with valid id and name deletes a primary host.`, async () => {
    const device = Device.instances[0]
    const prevLength = mqtt.service.config.sources.length
    const args = {
      id: mqtt.service.id,
      deviceId: device.id,
    }
    await resolvers.Mutation.deleteMqttSource({}, args, context, {})
    expect(mqtt.service.config.sources.length).toBe(prevLength - 1)
    expect(
      mqtt.service.config.sources.some((host) => host.name === args.name)
    ).toBe(false)
  })
  test(`deleteMqttSource with a service that isn't mqtt throws an error`, async () => {
    const device = Device.instances[0]
    const nonMqttService = await Service.create(
      'aService',
      'aDescription',
      'notMqtt',
      User.instances[0].id
    )
    const args = {
      id: nonMqttService.id,
      deviceId: device.id,
    }
    expect(
      await resolvers.Mutation.deleteMqttSource({}, args, context, {}).catch(
        (e) => e
      )
    ).toMatchInlineSnapshot(
      `[Error: Service with id 6 is not an mqtt service. It's type notMqtt]`
    )
  })
  test(`updateMqtt with invalid id throws an error.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.updateMqtt({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(Mqtt.instances.length).toBe(prevCount)
  })
  test(`deleteMqtt deletes a mqtt service with the selected settings.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: service.id,
    }
    const deletedService = await resolvers.Mutation.deleteMqtt(
      {},
      args,
      context,
      {}
    ).catch((error) => {
      throw error
    })
    expect(Mqtt.instances.length).toBe(prevCount - 1)
    expect(deletedService.id).toBe(args.id)
  })
  test(`deleteMqtt with invalid id throws an error.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: 1234567,
    }
    expect(
      await resolvers.Mutation.deleteMqtt({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: Service with id 1234567 does not exist.]`)
    expect(Mqtt.instances.length).toBe(prevCount)
  })
})

describe('Subscription: ', () => {
  test('tagUpdate subscribe returns an asyncIterator', () => {
    resolvers.Subscription.tagUpdate.subscribe({}, {}, context)
    expect(pubsub.asyncIterator).toBeCalledTimes(1)
  })
  test('deviceUpdate subscribe returns an asyncIterator', () => {
    resolvers.Subscription.deviceUpdate.subscribe({}, {}, context)
    expect(pubsub.asyncIterator).toBeCalledTimes(1)
  })
  test('serviceUpdate subscribe returns an asyncIterator', () => {
    resolvers.Subscription.serviceUpdate.subscribe({}, {}, context)
    expect(pubsub.asyncIterator).toBeCalledTimes(1)
  })
})
