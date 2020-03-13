jest.mock('../../logger')
const logger = require('../../logger')
const { createTestDb, deleteTestDb } = require('../../../test/db')
const { executeQuery, executeUpdate, Model } = require('../../database')

let db = undefined
beforeAll(async () => {
  db = await createTestDb().catch((error) => {
    throw error
  })
})

afterAll(async () => {
  await deleteTestDb(db).catch((error) => {
    throw error
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

class TestModel extends Model {
  static initialize(db, pubsub) {
    return super.initialize(db, pubsub, TestModel)
  }
  static checkInitialized() {
    return super.checkInitialized(this)
  }
}
TestModel.initialized = false
TestModel.fields = [{ colName: 'testField', colType: 'TEXT' }]
TestModel.instances = []
TestModel.table = 'test'

describe(`executeQuery:`, () => {
  test('Called with undefined params calls db.all with empty object.', () => {
    const mockdb = {
      all: jest.fn((sql, params, callback) => callback())
    }
    const sql = ``
    const params = undefined
    executeQuery(mockdb, sql, params)
    expect(mockdb.all).toBeCalledWith(sql, [], expect.any(Function))
    expect(mockdb.all).toBeCalledTimes(1)
  })
  test('If db call returns error, error is thrown', async () => {
    const sql = ``
    expect(await executeQuery(db, sql).catch((e) => e)).toMatchInlineSnapshot(
      `[Error: SQLITE_MISUSE: not an error]`
    )
  })
})

test('executeUpdate: Called with undefined params calls db.run with empty object.', () => {
  const mockdb = {
    run: jest.fn((sql, params, callback) => callback())
  }
  const sql = ``
  const params = undefined
  executeUpdate(mockdb, sql, params)
  expect(mockdb.run).toBeCalledWith(sql, [], expect.any(Function))
  expect(mockdb.run).toBeCalledTimes(1)
})

describe(`Model:`, () => {
  test('running get before initialize results in an error.', async () => {
    const error = await TestModel.get(1).catch((e) => e)
    expect(error).toMatchInlineSnapshot(
      `[Error: you need to run .initialize() before running any methods or accessing properties on a subclass of model.]`
    )
  })
  test('running getall before initialize results in an error.', async () => {
    const error = await TestModel.getAll().catch((e) => e)
    expect(error).toMatchInlineSnapshot(
      `[Error: you need to run .initialize() before running any methods or accessing properties on a subclass of model.]`
    )
  })
  test('running create before initialize results in an error.', async () => {
    const error = await TestModel.create().catch((e) => e)
    expect(error).toMatchInlineSnapshot(
      `[Error: you need to run .initialize() before running any methods or accessing properties on a subclass of model.]`
    )
  })
  test('running delete before initialize results in an error.', async () => {
    const error = await TestModel.delete().catch((e) => e)
    expect(error).toMatchInlineSnapshot(
      `[Error: you need to run .initialize() before running any methods or accessing properties on a subclass of model.]`
    )
  })
  test('running findById before initialize results in an error.', async () => {
    let error = null
    try {
      TestModel.findById(1)
    } catch (error) {
      expect(error).toMatchInlineSnapshot(
        `[Error: you need to run .initialize() before running any methods or accessing properties on a subclass of model.]`
      )
    }
  })

  test('initialized sets class parameters.', async () => {
    const pubsub = {}
    await TestModel.initialize(db, pubsub)
    expect(TestModel.db).toEqual(db)
    expect(TestModel.pubsub).toEqual(pubsub)
    expect(TestModel.initialized).toBe(true)
  })
  let testInstanceId = null
  let testInstance = null
  test('create returns an instance and adds it to the instances class.', async () => {
    testInstance = await TestModel.create({ testField: 'testValue' })
    expect(TestModel.instances.length).toBe(1)
    expect(TestModel.instances[0]).toEqual(testInstance)
    expect(testInstance.id).toEqual(expect.any(Number))
    expect(testInstance.initialized).toBe(true)
    testInstanceId = testInstance.id
  })
  test(`Running the constructor with an id that's already been logs an error.`, () => {
    let error = null
    new TestModel(testInstanceId)
    expect(logger.error).toBeCalledTimes(1)
  })
  test(`Running the constructor with an id that's not a number throws an error.`, () => {
    let error = null
    new TestModel(`This isn't a number.`)
    expect(logger.error).toBeCalledTimes(1)
  })
  test(`findById returns the appropriate instance.`, () => {
    const localInstance = TestModel.findById(testInstanceId)
    expect(localInstance.id).toBe(testInstanceId)
  })
  test('get returns the instance with the appropriate id.', async () => {
    const localInstance = await TestModel.get(testInstanceId)
    expect(localInstance.id).toBe(testInstanceId)
    expect(localInstance.initialized).toBe(true)
    expect(TestModel.instances.length).toBe(1)
  })
  test('get throws error if the id is not a number', async () => {
    await TestModel.get(`a bad id`)
    expect(logger.error).toBeCalledTimes(1)
  })
  test(`get throws error if the id doesn't existing in the database`, async () => {
    const result = await TestModel.get(123).catch((e) => e)
    expect(result.errors[0]).toMatchInlineSnapshot(
      `[Error: There is no test with id# 123.]`
    )
    expect(logger.error).toBeCalledTimes(1)
  })
  test('update sets field to new value', async () => {
    const newValue = `newTestValue`
    const result = await testInstance.update(1, 'testField', newValue)
    expect(result).toBe(newValue)
  })
  test('update throws exception on sqlite error', async () => {
    await testInstance.update()
    expect(logger.error).toBeCalledTimes(1)
  })
  test('delete removes the instance from constructor instances, deletes it from the database, and returns the deleted instance.', async () => {
    const localInstance = await testInstance.delete()
    expect(TestModel.instances.length).toBe(0)
    expect(localInstance.id).toBe(1)
  })
  test('Accessing id without running instance init throws an error.', async () => {
    const result = await new Promise((resolve, reject) => {
      return db.run(
        `INSERT INTO test (testField) VALUES ("testValue")`,
        function(error) {
          if (error) {
            reject(error)
          } else {
            resolve(this)
          }
        }
      )
    })
    const localTestInstance = new TestModel(result.lastID)
    let error = null
    try {
      localTestInstance.id
    } catch (e) {
      error = e
    }
    expect()
    expect(error).toMatchInlineSnapshot(
      `[Error: you need to run .init() before running any methods or accessing properties on this tag instance.]`
    )
  })
})

test(`Prioritize makes decisions based on priority`, async () => {
  const results = []
  await Promise.all([
    executeQuery(db, 'PRAGMA user_version', [], true, 4).then((result) =>
      results.push(result)
    ),
    executeUpdate(db, 'PRAGMA user_version = 100', [], 2).then((result) =>
      results.push(result)
    ),
    executeQuery(db, 'PRAGMA user_version', [], true, 3).then((result) =>
      results.push(result)
    ),
    executeQuery(db, 'PRAGMA user_version', [], true, 1).then((result) =>
      results.push(result)
    )
  ])
  expect(results).toMatchInlineSnapshot(`
Array [
  Object {
    "user_version": 2,
  },
  Object {
    "user_version": 2,
  },
  Statement {
    "changes": 1,
    "lastID": 2,
    "sql": "PRAGMA user_version = 100",
  },
  Object {
    "user_version": 100,
  },
]
`)
})
