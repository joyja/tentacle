jest.mock('modbus-serial')
jest.mock('ethernet-ip')
jest.mock('sparkplug-client')
const ModbusRTU = require(`modbus-serial`)
const { Controller } = require(`ethernet-ip`)
const sparkplug = require(`sparkplug-client`)
const { GraphQLClient, request } = require('graphql-request')
const { query, mutation } = require('../../test/graphql')
const { start, stop } = require('../server')
const _ = require('lodash')

const host = 'http://localhost:4000'
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
  stop: jest.fn()
}

beforeAll(async () => {
  await start(true)
  ModbusRTU.prototype.connectTCP.mockResolvedValue({})
  ModbusRTU.prototype.close.mockImplementation((callback) => {
    callback()
  })
  ModbusRTU.prototype.getTimeout.mockImplementation(() => {
    return 1000
  })
  Controller.prototype.connect.mockResolvedValue({})
  Controller.prototype.destroy.mockImplementation(() => {})
  sparkplug.newClient.mockImplementation(() => {
    return mockSparkplug
  })
})

afterAll(async () => {
  await stop()
})

beforeEach(() => {
  jest.useFakeTimers()
  ModbusRTU.prototype.connectTCP.mockClear()
  ModbusRTU.prototype.close.mockClear()
  Controller.prototype.connect.mockClear()
  Controller.prototype.destroy.mockClear()
  mockSparkplug.on.mockClear()
  mockSparkplug.publishNodeBirth.mockClear()
  mockSparkplug.publishDeviceBirth.mockClear()
  mockSparkplug.publishDeviceData.mockClear()
  mockSparkplug.publishDeviceDeath.mockClear()
  mockSparkplug.stop.mockClear()
})

let client = undefined
test('login with default username/password returns appropriate results.', async () => {
  const mutation = `mutation {
    login(username: "admin", password: "password") {
      user {
        id
        username
      }
      token
    }
  }`
  const {
    login: { user, token }
  } = await request(host, mutation).catch((error) => {
    throw error
  })
  expect(user).toEqual({
    id: expect.any(String),
    username: 'admin'
  })
  expect(Number.isInteger(parseInt(user.id))).toBe(true)
  expect(token).toEqual(expect.any(String))
  client = new GraphQLClient(host, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
})
let scanClass = undefined
test('create scan class with the proper headers and fields returns valid results', async () => {
  const mutation = `mutation {
    createScanClass(name: "default", rate: 1000) {
      id
      rate
    }
  }`
  const { createScanClass } = await client.request(mutation).catch((error) => {
    throw error
  })
  expect(createScanClass).toEqual({
    id: expect.any(String),
    rate: 1000
  })
  scanClass = createScanClass
})
test('create scan class without authorization headers returns error', async () => {
  const mutation = `mutation {
    createScanClass(name: "default", rate: 1000) {
      id
      rate
    }
  }`
  expect(await request(host, mutation).catch((e) => e)).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"createScanClass":null},"errors":[{"message":"You are not authorized.","locations":[{"line":2,"column":5}],"path":["createScanClass"]}],"status":200},"request":{"query":"mutation {\\n    createScanClass(name: \\"default\\", rate: 1000) {\\n      id\\n      rate\\n    }\\n  }"}}]`
  )
})
test('scan class query returns a list of scan classes', async () => {
  const query = `query {
    scanClasses {
      id
      rate
    }
  }`
  const { scanClasses } = await client.request(query).catch((error) => {
    throw error
  })
  expect(scanClasses).toEqual([scanClass])
})
test('scan class query returns a list of scan classes', async () => {
  scanClass.rate = 1234
  const mutation = `mutation UpdateScanClass($id: ID!, $rate: Int!){
    updateScanClass(id: $id, rate: $rate) {
      id
      rate
    }
  }`
  const { updateScanClass } = await client
    .request(mutation, scanClass)
    .catch((error) => {
      throw error
    })
  expect(updateScanClass).toEqual(scanClass)
})
let tag = undefined
let tagFields = undefined
test('create tag with the proper headers and fields returns valid results', async () => {
  tagFields = {
    name: 'aTag',
    description: 'A Description',
    value: '123',
    datatype: 'FLOAT',
    scanClassId: scanClass.id
  }
  const { createTag } = await client
    .request(mutation.createTag, tagFields)
    .catch((error) => {
      throw error
    })
  expect(createTag).toEqual({
    id: '1',
    ..._.omit(tagFields, ['scanClassId']),
    scanClass: scanClass,
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: expect.any(String)
  })
  tag = createTag
})
test('create tag without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.createTag, tagFields).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"createTag":null},"errors":[{"message":"You are not authorized.","locations":[{"line":9,"column":5}],"path":["createTag"]}],"status":200},"request":{"query":"\\n  mutation CreateTag(\\n      $name: String!\\n      $description: String!\\n      $value: String!\\n      $datatype: Datatype!\\n      $scanClassId: ID!\\n    ) {\\n    createTag(\\n      name: $name\\n      description: $description\\n      value: $value\\n      datatype: $datatype\\n      scanClassId: $scanClassId\\n    ) {\\n      ...FullTag\\n    }\\n  }\\n  \\n  fragment FullTag on Tag {\\n    ...ScalarTag\\n    scanClass {\\n      ...ScalarScanClass\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n  \\nfragment ScalarScanClass on ScanClass {\\n  id\\n  rate\\n}\\n\\n\\n","variables":{"name":"aTag","description":"A Description","value":"123","datatype":"FLOAT","scanClassId":"1"}}}]`
  )
})
test('tag query returns a list of tags', async () => {
  const { tags } = await client.request(query.tags).catch((error) => {
    throw error
  })
  expect(tags).toEqual([tag])
})
test('tag query without authorization headers returns error', async () => {
  expect(await request(host, query.tags).catch((e) => e)).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":null,"errors":[{"message":"You are not authorized.","locations":[{"line":3,"column":5}],"path":["tags"]}],"status":200},"request":{"query":"\\n  query Tags {\\n    tags {\\n      ...FullTag\\n    }\\n  }\\n  \\n  fragment FullTag on Tag {\\n    ...ScalarTag\\n    scanClass {\\n      ...ScalarScanClass\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n  \\nfragment ScalarScanClass on ScanClass {\\n  id\\n  rate\\n}\\n\\n\\n"}}]`
  )
})
test('updateTag updates the tag values', async () => {
  tag.name = 'anotherTag'
  tag.description = 'Another Tag'
  tag.value = '321'
  const { updateTag } = await client
    .request(mutation.updateTag, tag)
    .catch((error) => {
      throw error
    })
  expect(updateTag).toEqual(tag)
})
test('updateTag updates the tag values', async () => {
  expect(
    await request(host, mutation.updateTag, { id: tag.id }).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"updateTag":null},"errors":[{"message":"You are not authorized.","locations":[{"line":7,"column":3}],"path":["updateTag"]}],"status":200},"request":{"query":"mutation UpdateTag(\\n  $id: ID!, \\n  $name: String\\n  $description: String\\n  $value: String\\n) {\\n  updateTag(\\n    id: $id, \\n    name: $name\\n    description: $description\\n    value: $value\\n  ) {\\n    ...FullTag\\n  }\\n}\\n\\n  fragment FullTag on Tag {\\n    ...ScalarTag\\n    scanClass {\\n      ...ScalarScanClass\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n  \\nfragment ScalarScanClass on ScanClass {\\n  id\\n  rate\\n}\\n\\n","variables":{"id":"1"}}}]`
  )
})
let modbus = undefined
let modbusFields = undefined
test('create modbus with the proper headers and fields returns valid results', async () => {
  modbusFields = {
    name: `aModbus`,
    description: `A Modbus`,
    host: `localhost`,
    port: 502,
    reverseBits: true,
    reverseWords: true,
    zeroBased: true,
    timeout: 1000
  }
  const { createModbus } = await client
    .request(mutation.createModbus, modbusFields)
    .catch((error) => {
      throw error
    })
  expect(ModbusRTU.prototype.connectTCP).toBeCalledTimes(1)
  expect(ModbusRTU.prototype.close).toBeCalledTimes(0)
  expect(createModbus).toEqual({
    id: '1',
    ..._.pick(modbusFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(modbusFields, ['name', 'description', 'port']),
      port: `${modbusFields.port}`,
      sources: [],
      status: 'connected'
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: expect.any(String)
  })
  modbus = createModbus
})
test('create modbus without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.createModbus, modbusFields).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"createModbus":null},"errors":[{"message":"You are not authorized.","locations":[{"line":11,"column":3}],"path":["createModbus"]}],"status":200},"request":{"query":"mutation CreateModbus (\\n  $name: String!\\n  $description: String!\\n  $host: String!\\n  $port: Int!\\n  $reverseBits: Boolean!\\n  $reverseWords: Boolean!\\n  $zeroBased: Boolean!\\n  $timeout: Int!\\n){\\n  createModbus(\\n    name: $name\\n    description: $description\\n    host: $host\\n    port: $port\\n    reverseBits: $reverseBits\\n    reverseWords: $reverseWords\\n    zeroBased: $zeroBased\\n    timeout: $timeout\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"name":"aModbus","description":"A Modbus","host":"localhost","port":502,"reverseBits":true,"reverseWords":true,"zeroBased":true,"timeout":1000}}}]`
  )
  expect(ModbusRTU.prototype.connectTCP).toBeCalledTimes(0)
  expect(ModbusRTU.prototype.close).toBeCalledTimes(0)
})
test('updateModbus updates the modbus values', async () => {
  modbusFields.id = modbus.id
  modbusFields.name = 'anotherModbus'
  modbusFields.description = 'Another Modbus'
  modbusFields.host = `localhost`
  modbusFields.port = 503
  modbusFields.reverseBits = false
  modbusFields.reverseWords = false
  modbusFields.zeroBased = false
  const { updateModbus } = await client
    .request(mutation.updateModbus, modbusFields)
    .catch((error) => {
      throw error
    })
  expect(ModbusRTU.prototype.connectTCP).toBeCalledTimes(1)
  expect(ModbusRTU.prototype.close).toBeCalledTimes(1)
  expect(updateModbus).toEqual({
    id: '1',
    ..._.pick(modbusFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(modbusFields, ['name', 'description', 'port']),
      port: `${modbusFields.port}`,
      sources: [],
      status: 'connected'
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: modbus.createdOn
  })
  modbus = updateModbus
})
test('updateModbus without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.updateModbus, { id: modbus.id }).catch(
      (e) => e
    )
  ).toMatchInlineSnapshot(
    `[Error: Variable "$timeout" of required type "Int!" was not provided.: {"response":{"errors":[{"message":"Variable \\"$timeout\\" of required type \\"Int!\\" was not provided.","locations":[{"line":10,"column":3}]}],"status":400},"request":{"query":"mutation UpdateModbus (\\n  $id: ID!\\n  $name: String\\n  $description: String\\n  $host: String\\n  $port: Int\\n  $reverseBits: Boolean\\n  $reverseWords: Boolean\\n  $zeroBased: Boolean\\n  $timeout: Int!\\n){\\n  updateModbus(\\n    id: $id\\n    name: $name\\n    description: $description\\n    host: $host\\n    port: $port\\n    reverseBits: $reverseBits\\n    reverseWords: $reverseWords\\n    zeroBased: $zeroBased\\n    timeout: $timeout\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"id":"1"}}}]`
  )
  expect(ModbusRTU.prototype.connectTCP).toBeCalledTimes(0)
  expect(ModbusRTU.prototype.close).toBeCalledTimes(0)
})
let ethernetip = undefined
let ethernetipFields = undefined
test('create ethernetip with the proper headers and fields returns valid results', async () => {
  ethernetipFields = {
    name: 'aEthernetIP',
    description: 'A EthernetIP',
    host: 'localhost',
    slot: 0
  }
  const { createEthernetIP } = await client
    .request(mutation.createEthernetIP, ethernetipFields)
    .catch((error) => {
      throw error
    })
  expect(Controller.prototype.connect).toBeCalledTimes(1)
  expect(Controller.prototype.destroy).toBeCalledTimes(0)
  expect(createEthernetIP).toEqual({
    id: '2',
    ..._.pick(ethernetipFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(ethernetipFields, ['name', 'description', 'slot']),
      slot: `${ethernetipFields.slot}`,
      sources: [],
      status: 'connected'
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: expect.any(String)
  })
  ethernetip = createEthernetIP
})
test('create ethernetip without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.createEthernetIP, ethernetipFields).catch(
      (e) => e
    )
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"createEthernetIP":null},"errors":[{"message":"You are not authorized.","locations":[{"line":7,"column":3}],"path":["createEthernetIP"]}],"status":200},"request":{"query":"mutation CreateEthernetIP (\\n  $name: String!\\n  $description: String!\\n  $host: String!\\n  $slot: Int!\\n){\\n  createEthernetIP(\\n    name: $name\\n    description: $description\\n    host: $host\\n    slot: $slot\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"name":"aEthernetIP","description":"A EthernetIP","host":"localhost","slot":0}}}]`
  )
  expect(Controller.prototype.connect).toBeCalledTimes(0)
  expect(Controller.prototype.destroy).toBeCalledTimes(0)
})
test('updateEthernetIP updates the ethernetip values', async () => {
  ethernetipFields = {
    id: ethernetip.id,
    name: 'anotherEthernetIP',
    description: 'Another EthernetIP',
    host: '192.168.1.1',
    slot: 1
  }
  const { updateEthernetIP } = await client
    .request(mutation.updateEthernetIP, ethernetipFields)
    .catch((error) => {
      throw error
    })
  expect(Controller.prototype.connect).toBeCalledTimes(1)
  expect(Controller.prototype.destroy).toBeCalledTimes(1)
  expect(updateEthernetIP).toEqual({
    id: ethernetip.id,
    ..._.pick(ethernetipFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(ethernetipFields, ['id', 'name', 'description', 'slot']),
      slot: `${ethernetipFields.slot}`,
      sources: [],
      status: 'connected'
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: ethernetip.createdOn
  })
  ethernetip = updateEthernetIP
})
test('updateEthernetIP without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.updateEthernetIP, { id: ethernetip.id }).catch(
      (e) => e
    )
  ).toMatchInlineSnapshot(
    `[Error: Variable "$name" of required type "String!" was not provided.: {"response":{"errors":[{"message":"Variable \\"$name\\" of required type \\"String!\\" was not provided.","locations":[{"line":3,"column":3}]},{"message":"Variable \\"$description\\" of required type \\"String!\\" was not provided.","locations":[{"line":4,"column":3}]},{"message":"Variable \\"$host\\" of required type \\"String!\\" was not provided.","locations":[{"line":5,"column":3}]},{"message":"Variable \\"$slot\\" of required type \\"Int!\\" was not provided.","locations":[{"line":6,"column":3}]}],"status":400},"request":{"query":"mutation UpdateEthernetIP (\\n  $id: ID!\\n  $name: String!\\n  $description: String!\\n  $host: String!\\n  $slot: Int!\\n){\\n  updateEthernetIP(\\n    id: $id\\n    name: $name\\n    description: $description\\n    host: $host\\n    slot: $slot\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"id":"2"}}}]`
  )
  expect(Controller.prototype.connect).toBeCalledTimes(0)
  expect(Controller.prototype.destroy).toBeCalledTimes(0)
})
test('device query returns a list of devices', async () => {
  const { devices } = await client.request(query.devices).catch((error) => {
    throw error
  })
  expect(devices).toEqual([modbus, ethernetip])
})
test('device query without authorization headers returns error', async () => {
  expect(
    await request(host, query.devices).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":null,"errors":[{"message":"You are not authorized.","locations":[{"line":3,"column":5}],"path":["devices"]}],"status":200},"request":{"query":"\\n  query Devices {\\n    devices {\\n      ...FullDevice\\n    }\\n  }\\n  \\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n\\n"}}]`
  )
})
mqttFields = undefined
mqtt = undefined
test('create mqtt with the proper headers and fields returns valid results', async () => {
  mqttFields = {
    name: 'aMqtt',
    description: 'A Mqtt',
    host: 'localhost',
    port: 1883,
    group: 'aGroup',
    node: 'aNode',
    username: 'aUsername',
    password: 'aPassword',
    devices: [1],
    rate: 1000,
    encrypt: true
  }
  const { createMqtt } = await client
    .request(mutation.createMqtt, mqttFields)
    .catch((error) => {
      throw error
    })
  expect(setInterval).toBeCalledTimes(1)
  expect(clearInterval).toBeCalledTimes(0)
  expect(mockSparkplug.on).toBeCalledTimes(4)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(1)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(1)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(0)
  expect(mockSparkplug.stop).toBeCalledTimes(0)
  expect(createMqtt).toEqual({
    id: '1',
    ..._.pick(mqttFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(mqttFields, ['name', 'description', 'port', 'devices']),
      port: `${mqttFields.port}`,
      sources: [
        {
          device: {
            id: modbus.id
          }
        }
      ]
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: expect.any(String)
  })
  mqtt = createMqtt
})
test('create mqtt without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.createMqtt, mqttFields).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"createMqtt":null},"errors":[{"message":"You are not authorized.","locations":[{"line":14,"column":3}],"path":["createMqtt"]}],"status":200},"request":{"query":"mutation CreateMqtt (\\n    $name: String!\\n    $description: String!\\n    $host: String! \\n    $port: Int!\\n    $group: String!\\n    $node: String!\\n    $username: String!\\n    $password: String!\\n    $devices: [Int!]!\\n    $rate: Int!\\n    $encrypt: Boolean!\\n){\\n  createMqtt(\\n    name: $name\\n    description: $description\\n    host: $host \\n    port: $port\\n    group: $group\\n    node: $node\\n    username: $username\\n    password: $password\\n    devices: $devices\\n    rate: $rate\\n    encrypt: $encrypt\\n  ) {\\n    ... FullService\\n  }\\n}\\n\\n  fragment FullService on Service {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Mqtt {\\n        id\\n        host\\n        port\\n        group\\n        node\\n        username\\n        password\\n        rate\\n        encrypt\\n        sources {\\n          device {\\n            id\\n          }\\n        }\\n      }\\n    }\\n  }\\n","variables":{"name":"aMqtt","description":"A Mqtt","host":"localhost","port":1883,"group":"aGroup","node":"aNode","username":"aUsername","password":"aPassword","devices":[1],"rate":1000,"encrypt":true}}}]`
  )
  expect(setInterval).toBeCalledTimes(0)
  expect(clearInterval).toBeCalledTimes(0)
  expect(mockSparkplug.on).toBeCalledTimes(0)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(0)
  expect(mockSparkplug.stop).toBeCalledTimes(0)
})
test('update mqtt with the proper headers and fields returns valid results', async () => {
  mqttFields = {
    id: mqtt.id,
    name: 'anotherMqtt',
    description: 'Another Mqtt',
    host: 'mqtt.jarautomation.io',
    port: 31112,
    group: 'anotherGroup',
    node: 'anotherNode',
    username: 'anotherUsername',
    password: 'anotherPassword',
    rate: 2000,
    encrypt: false
  }
  const { updateMqtt } = await client
    .request(mutation.updateMqtt, mqttFields)
    .catch((error) => {
      throw error
    })
  expect(setInterval).toBeCalledTimes(1)
  expect(clearInterval).toBeCalledTimes(1)
  expect(mockSparkplug.on).toBeCalledTimes(4)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(1)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(1)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(1)
  expect(mockSparkplug.stop).toBeCalledTimes(1)
  expect(updateMqtt).toEqual({
    id: mqtt.id,
    ..._.pick(mqttFields, ['name', 'description']),
    config: {
      id: '1',
      ..._.omit(mqttFields, ['name', 'description', 'port', 'devices']),
      port: `${mqttFields.port}`,
      sources: [
        {
          device: {
            id: modbus.id
          }
        }
      ]
    },
    createdBy: {
      id: '1',
      username: 'admin'
    },
    createdOn: mqtt.createdOn
  })
  mqtt = updateMqtt
})
test('update mqtt without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.updateMqtt, mqttFields).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"updateMqtt":null},"errors":[{"message":"You are not authorized.","locations":[{"line":14,"column":3}],"path":["updateMqtt"]}],"status":200},"request":{"query":"mutation UpdateMqtt (\\n  $id: ID!\\n  $name: String\\n  $description: String\\n  $host: String \\n  $port: Int\\n  $group: String\\n  $node: String\\n  $username: String\\n  $password: String\\n  $rate: Int\\n  $encrypt: Boolean\\n){\\n  updateMqtt(\\n    id: $id\\n    name: $name\\n    description: $description\\n    host: $host \\n    port: $port\\n    group: $group\\n    node: $node\\n    username: $username\\n    password: $password\\n    rate: $rate\\n    encrypt: $encrypt\\n  ) {\\n    ... FullService\\n  }\\n}\\n\\n  fragment FullService on Service {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Mqtt {\\n        id\\n        host\\n        port\\n        group\\n        node\\n        username\\n        password\\n        rate\\n        encrypt\\n        sources {\\n          device {\\n            id\\n          }\\n        }\\n      }\\n    }\\n  }\\n","variables":{"id":"1","name":"anotherMqtt","description":"Another Mqtt","host":"mqtt.jarautomation.io","port":31112,"group":"anotherGroup","node":"anotherNode","username":"anotherUsername","password":"anotherPassword","rate":2000,"encrypt":false}}}]`
  )
  expect(setInterval).toBeCalledTimes(0)
  expect(clearInterval).toBeCalledTimes(0)
  expect(mockSparkplug.on).toBeCalledTimes(0)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(0)
  expect(mockSparkplug.stop).toBeCalledTimes(0)
})
test('service query returns a list of services', async () => {
  const { services } = await client.request(query.services).catch((error) => {
    throw error
  })
  expect(services).toEqual([mqtt])
  expect(mockSparkplug.on).toBeCalledTimes(0)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(0)
  expect(mockSparkplug.stop).toBeCalledTimes(0)
})
test('service query without authorization headers returns error', async () => {
  expect(
    await request(host, query.services).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":null,"errors":[{"message":"You are not authorized.","locations":[{"line":3,"column":5}],"path":["services"]}],"status":200},"request":{"query":"\\n  query Services {\\n    services {\\n      ...FullService\\n    }\\n  }\\n  \\n  fragment FullService on Service {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Mqtt {\\n        id\\n        host\\n        port\\n        group\\n        node\\n        username\\n        password\\n        rate\\n        encrypt\\n        sources {\\n          device {\\n            id\\n          }\\n        }\\n      }\\n    }\\n  }\\n\\n"}}]`
  )
  expect(mockSparkplug.on).toBeCalledTimes(0)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(0)
  expect(mockSparkplug.stop).toBeCalledTimes(0)
})
test('delete service without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.deleteMqtt, { id: mqtt.id }).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"deleteMqtt":null},"errors":[{"message":"You are not authorized.","locations":[{"line":4,"column":3}],"path":["deleteMqtt"]}],"status":200},"request":{"query":"mutation DeleteMqtt (\\n  $id: ID!\\n){\\n  deleteMqtt(\\n    id: $id\\n  ) {\\n    ... FullService\\n  }\\n}\\n\\n  fragment FullService on Service {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Mqtt {\\n        id\\n        host\\n        port\\n        group\\n        node\\n        username\\n        password\\n        rate\\n        encrypt\\n        sources {\\n          device {\\n            id\\n          }\\n        }\\n      }\\n    }\\n  }\\n","variables":{"id":"1"}}}]`
  )
})
test('delete mqtt with valid arguments and credentials returns deleted service', async () => {
  const { deleteMqtt } = await client
    .request(mutation.deleteMqtt, { id: mqtt.id })
    .catch((error) => {
      throw error
    })
  expect(setInterval).toBeCalledTimes(0)
  expect(clearInterval).toBeCalledTimes(1)
  expect(mockSparkplug.on).toBeCalledTimes(0)
  expect(mockSparkplug.publishNodeBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceBirth).toBeCalledTimes(0)
  expect(mockSparkplug.publishDeviceDeath).toBeCalledTimes(1)
  expect(mockSparkplug.stop).toBeCalledTimes(1)
  expect(deleteMqtt.id).toEqual(mqtt.id)
  const { services } = await client.request(query.services).catch((error) => {
    error
  })
  const isStillThere = services.some((service) => {
    service.id === deleteMqtt.id
  })
  expect(isStillThere).toBe(false)
})
test('delete modbus without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.deleteModbus, { id: modbus.id }).catch(
      (e) => e
    )
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"deleteModbus":null},"errors":[{"message":"You are not authorized.","locations":[{"line":4,"column":3}],"path":["deleteModbus"]}],"status":200},"request":{"query":"mutation DeleteModbus (\\n  $id: ID!\\n){\\n  deleteModbus(\\n    id: $id\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"id":"1"}}}]`
  )
})
test('delete modbus with valid arguments and credentials returns deleted device', async () => {
  const { deleteModbus } = await client
    .request(mutation.deleteModbus, { id: modbus.id })
    .catch((error) => {
      throw error
    })
  expect(ModbusRTU.prototype.connectTCP).toBeCalledTimes(0)
  expect(ModbusRTU.prototype.close).toBeCalledTimes(0)
  expect(deleteModbus.id).toEqual(modbus.id)
  const { devices } = await client.request(query.devices).catch((error) => {
    error
  })
  const isStillThere = devices.some((device) => {
    device.id === deleteModbus.id
  })
  expect(isStillThere).toBe(false)
})
test('delete ethernetip without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.deleteEthernetIP, { id: ethernetip.id }).catch(
      (e) => e
    )
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"deleteEthernetIP":null},"errors":[{"message":"You are not authorized.","locations":[{"line":4,"column":3}],"path":["deleteEthernetIP"]}],"status":200},"request":{"query":"mutation DeleteEthernetIP (\\n  $id: ID!\\n){\\n  deleteEthernetIP(\\n    id: $id\\n  ) {\\n    ... FullDevice\\n  }\\n}\\n\\n  fragment FullDevice on Device {\\n    id\\n    name\\n    description\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n    config {\\n      ... on Modbus {\\n        id\\n        host\\n        port\\n        reverseBits\\n        reverseWords\\n        status\\n        zeroBased\\n        timeout\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n        }\\n      }\\n    }\\n    config {\\n      ... on EthernetIP {\\n        id\\n        host\\n        slot\\n        sources {\\n          tag {\\n            ...ScalarTag\\n          }\\n          tagname\\n        }\\n        status\\n      }\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n","variables":{"id":"2"}}}]`
  )
})
test('delete ethernetip with valid arguments and credentials returns deleted device', async () => {
  const { deleteEthernetIP } = await client
    .request(mutation.deleteEthernetIP, { id: ethernetip.id })
    .catch((error) => {
      throw error
    })
  expect(Controller.prototype.connect).toBeCalledTimes(0)
  expect(Controller.prototype.destroy).toBeCalledTimes(1)
  expect(deleteEthernetIP.id).toEqual(ethernetip.id)
  const { devices } = await client.request(query.devices).catch((error) => {
    error
  })
  const isStillThere = devices.some((device) => {
    device.id === deleteEthernetIP.id
  })
  expect(isStillThere).toBe(false)
})
test('delete tag without authorization headers returns error', async () => {
  expect(
    await request(host, mutation.deleteTag, { id: tag.id }).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"deleteTag":null},"errors":[{"message":"You are not authorized.","locations":[{"line":4,"column":3}],"path":["deleteTag"]}],"status":200},"request":{"query":"mutation DeleteTag(\\n  $id: ID!, \\n) {\\n  deleteTag(\\n    id: $id, \\n  ) {\\n    ...FullTag\\n  }\\n}\\n\\n  fragment FullTag on Tag {\\n    ...ScalarTag\\n    scanClass {\\n      ...ScalarScanClass\\n    }\\n  }\\n  \\n  fragment ScalarTag on Tag {\\n    id\\n    name\\n    description\\n    datatype\\n    value\\n    createdBy {\\n      id\\n      username\\n    }\\n    createdOn\\n  }\\n\\n  \\nfragment ScalarScanClass on ScanClass {\\n  id\\n  rate\\n}\\n\\n","variables":{"id":"1"}}}]`
  )
})
test('delete tag with valid arguments and credentials returns deleted device', async () => {
  const { deleteTag } = await client
    .request(mutation.deleteTag, { id: tag.id })
    .catch((error) => {
      throw error
    })
  expect(deleteTag.id).toEqual(tag.id)
  const { tags } = await client.request(query.tags).catch((error) => {
    error
  })
  const isStillThere = tags.some((tag) => {
    tag.id === deleteTag.id
  })
  expect(isStillThere).toBe(false)
})
test('delete scanClass without authorization headers returns error', async () => {
  expect(
    await request(
      host,
      `mutation DeleteScanClass($id: ID!){
      deleteScanClass(id: $id) {
        id
        rate
      }
    }`,
      { id: scanClass.id }
    ).catch((e) => e)
  ).toMatchInlineSnapshot(
    `[Error: You are not authorized.: {"response":{"data":{"deleteScanClass":null},"errors":[{"message":"You are not authorized.","locations":[{"line":2,"column":7}],"path":["deleteScanClass"]}],"status":200},"request":{"query":"mutation DeleteScanClass($id: ID!){\\n      deleteScanClass(id: $id) {\\n        id\\n        rate\\n      }\\n    }","variables":{"id":"1"}}}]`
  )
})
test('delete scanClass with valid credentials deletes a scan class', async () => {
  const mutation = `mutation DeleteScanClass($id: ID!){
    deleteScanClass(id: $id) {
      id
      rate
    }
  }`
  const { deleteScanClass } = await client
    .request(mutation, scanClass)
    .catch((error) => {
      throw error
    })
  expect(deleteScanClass.id).toEqual(scanClass.id)
  const { scanClasses } = await client
    .request(
      `query {
      scanClasses {
        id
        rate
      }
    }`
    )
    .catch((error) => {
      error
    })
  const isStillThere = scanClasses.some((scanClass) => {
    scanClass.id === deleteTag.id
  })
  expect(isStillThere).toBe(false)
})
