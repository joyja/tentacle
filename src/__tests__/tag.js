jest.mock(`modbus-serial`)
jest.mock(`ethernet-ip`)
const { createTestDb, deleteTestDb } = require('../../test/db')
const { User, Tag, ScanClass } = require('../relations')
const fromUnixTime = require('date-fns/fromUnixTime')
const ModbusRTU = require(`modbus-serial`)
const { Controller } = require(`ethernet-ip`)

const dbFilename = `test-tag-spread-edge.db`
const pubsub = {}
let db = undefined
beforeAll(async () => {
  db = await createTestDb(dbFilename).catch((error) => {
    throw error
  })
})

afterAll(async () => {
  await deleteTestDb(db).catch((error) => {
    throw error
  })
})

test(`Tag: initialize initializes ScanClass to.`, async () => {
  await Tag.initialize(db, pubsub)
  expect(ScanClass.initialized).toBe(true)
})

jest.useFakeTimers()
describe(`ScanClass:`, () => {
  test(`create creates a new ScanClass with the appropriate fields.`, async () => {
    await User.initialize(db, pubsub)
    const user = User.instances[0]
    const rate = 1000
    const scanClass = await ScanClass.create(rate, user.id)
    expect(ScanClass.instances.length).toBe(1)
    expect(scanClass.id).toEqual(expect.any(Number))
    expect(scanClass.rate).toBe(rate)
    expect(scanClass.createdBy.id).toBe(user.id)
  })
  test(`stopScan doesn't clear an interval if there is isn't one.`, () => {
    const scanClass = ScanClass.instances[0]
    scanClass.stopScan()
    expect(clearInterval).toHaveBeenCalledTimes(0)
  })
  test(`startScan creates an interval`, () => {
    const scanClass = ScanClass.instances[0]
    scanClass.startScan()
    expect(setInterval).toHaveBeenCalledTimes(1)
    expect(setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      scanClass.rate
    )
  })
  test(`stopScan clears an interval if there is one.`, () => {
    const scanClass = ScanClass.instances[0]
    scanClass.stopScan()
    expect(clearInterval).toHaveBeenCalledTimes(1)
  })
  test(`Getters all return their underscore values`, () => {
    const scanClass = ScanClass.instances[0]
    expect(scanClass.rate).toBe(scanClass._rate)
    expect(scanClass.createdBy.id).toBe(scanClass._createdBy)
    expect(scanClass.createdOn).toStrictEqual(
      fromUnixTime(scanClass._createdOn)
    )
  })
  test(`Setters all set the values appropriately`, async () => {
    const scanClass = ScanClass.instances[0]
    const rate = 1234
    await scanClass.setRate(rate)
    expect(scanClass.rate).toBe(rate)
  })
})
let tag = null
describe('Tag:', () => {
  test(`create creates a new Tag with the appropriate fields.`, async () => {
    const name = `testTag`
    const description = `Test Tag`
    const value = 123
    const scanClass = ScanClass.instances[0].id
    const createdBy = User.instances[0].id
    const datatype = `INT32`
    tag = await Tag.create(
      name,
      description,
      value,
      scanClass,
      createdBy,
      datatype
    )
    expect(tag.createdBy.id).toBe(createdBy)
    expect(tag.datatype).toBe(datatype)
  })
  test(`check that init sets the appropriate underscore fields.`, async () => {
    Tag.instances = []
    const uninitTag = new Tag(tag.id)
    await uninitTag.init()
    expect(uninitTag._name).toBe(tag._name)
    expect(uninitTag._description).toBe(tag._description)
    expect(uninitTag._value).toBe(tag._value)
    expect(uninitTag._scanClass).toBe(tag._scanClass)
    expect(uninitTag._createdBy).toBe(tag._createdBy)
    expect(uninitTag._CreatedOn).toBe(tag._CreatedOn)
    expect(uninitTag._datatype).toBe(tag._datatype)
    await Tag.getAll()
  })
  test(`Getters all return their underscore values`, () => {
    expect(tag.name).toBe(tag._name)
    expect(tag.description).toBe(tag._description)
    expect(tag.value).toBe(parseInt(tag._value))
    expect(tag.scanClass.id).toBe(tag._scanClass)
    expect(tag.createdBy.id).toBe(tag._createdBy)
    expect(tag.createdOn).toStrictEqual(fromUnixTime(tag._createdOn))
    expect(tag.datatype).toBe(tag._datatype)
  })
  test(`Setters all set the values appropriately`, async () => {
    const name = `newName`
    const description = `New description`
    const value = 321
    const datatype = `FLOAT`
    await tag.setName(name)
    await tag.setDescription(description)
    await tag.setValue(value)
    await tag.setDatatype(datatype)
    expect(tag.name).toBe(name)
    expect(tag.description).toBe(description)
    expect(tag.value).toBe(value)
    expect(tag.datatype).toBe(datatype)
  })
})
test(`ScanClass: tags returns the tags we've assigned this scan class to.`, () => {
  const scanClass = ScanClass.instances[0]
  expect(scanClass.tags.length).toBe(1)
  expect(scanClass.tags[0].id).toBe(Tag.instances[0].id)
})
