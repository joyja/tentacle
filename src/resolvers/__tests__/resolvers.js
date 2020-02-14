jest.mock(`sparkplug-client`)
jest.mock(`modbus-serial`)
jest.mock(`ethernet-ip`)
const ModbusRTU = require(`modbus-serial`)
const { Controller } = require(`ethernet-ip`)
const sparkplug = require(`sparkplug-client`)

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
  Service,
  Mqtt,
  MqttSource
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
  client: {
    subscribe: jest.fn(),
    on: jest.fn()
  }
}
const bcrypt = require('bcryptjs')

const resolvers = require('../index')

const dbFilename = `test-resolvers-spread-edge.db`

let db = undefined
let user = undefined
let context = {}
let unauthorizedContext = {}
const pubsub = {}
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
  db = await createTestDb(dbFilename).catch((error) => {
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
  context.request = {
    headers: {
      authorization: `Bearer ${token}`
    }
  }
  unauthorizedContext.request = {
    headers: {}
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
    scanClass,
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
      password: 'password'
    }
    const payload = await resolvers.Mutation.login({}, args, context, {}).catch(
      (error) => {
        throw error
      }
    )
    expect(payload).toEqual({
      token: expect.any(String),
      user
    })
  })
  test(`login with incorrect username causes an error.`, async () => {
    args = {
      username: `bogusUsername`,
      password: 'password'
    }
    expect(
      await resolvers.Mutation.login({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`login with incorrect password causes an error.`, async () => {
    args = {
      username: user.username,
      password: 'bogusPassword'
    }
    expect(
      await resolvers.Mutation.login({}, args, context, {}).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`changePassword changes the password`, async () => {
    args = {
      newPassword: `aNewPassword`,
      oldPassword: `password`
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
      rate: 1000
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
      rate: 2000
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
  test(`updateScanClass throws error on invalid ID.`, async () => {
    prevCount = ScanClass.instances.length
    const args = {
      id: 1234567,
      rate: 2000
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
      id: 1234567
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
      id: scanClass.id
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
      scanClassId: ScanClass.instances[0].id
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
      scanClassId: ScanClass.instances[1].id
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
      scanClassId: ScanClass.instances[1].id
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
      id: tag.id
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
      id: 1234567
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
      zeroBased: true
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
      zeroBased: false
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
  test(`deleteModbus deletes a modbus device with the selected settings.`, async () => {
    prevCount = Modbus.instances.length
    const args = {
      id: device.id
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
  test(`createModbusSource creates a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      deviceId: Modbus.instances[0].device.id,
      tagId: Tag.instances[0].id,
      register: 12345,
      registerType: `BOOLEAN`
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
      registerType: `FLOAT`
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
  test(`deleteModbusSource deletes a modbus device with the selected settings.`, async () => {
    prevCount = ModbusSource.instances.length
    const args = {
      tagId: Tag.instances[0].id
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
  test(`createEthernetIP creates a ethernetip device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      name: `resolverTestEthernetIP`,
      description: `Resolver Test EthernetIP`,
      host: 'localhost',
      slot: 0
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
      slot: 3
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
  test(`deleteEthernetIP deletes a ethernetip device with the selected settings.`, async () => {
    prevCount = EthernetIP.instances.length
    const args = {
      id: device.id
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
  let ethernetipSource = undefined
  test(`createEthernetIPSource creates a ethernetip source with the selected settings.`, async () => {
    prevCount = EthernetIPSource.instances.length
    const args = {
      deviceId: EthernetIP.instances[0].device.id,
      tagId: Tag.instances[0].id,
      tagname: `Tagname`
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
      tagname: `aDifferentTagname`
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
      tagId: Tag.instances[0].id
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
      rate: 1000
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
      Device.findById(args.devices[0])
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
      rate: 1000
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
  test(`deleteMqtt deletes a mqtt service with the selected settings.`, async () => {
    prevCount = Mqtt.instances.length
    const args = {
      id: service.id
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
})
