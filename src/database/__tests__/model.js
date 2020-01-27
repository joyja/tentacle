const { createTestDb, deleteTestDb } = require('../../../test/db')
const { executeQuery, executeUpdate, Model } = require('../../database')

const dbFilename = `test-model-spread-edge.db`

let db = undefined
beforeAll(async () => {
  db = await createTestDb(dbFilename)
  // const sql = `CREATE TABLE ${testModelTable} (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE, testField TEXT)`
  // const params = []
  // await new Promise((resolve, reject) => {
  //   return db.run(sql, params, (error) => {
  //     if (error) {
  //       reject(error)
  //     }
  //     resolve()
  //   })
  // }).catch((error) => {
  //   throw error
  // })
})

afterAll(async () => {
  await deleteTestDb(db)
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
    const db = {
      all: jest.fn((sql, params, callback) => [])
    }
    const sql = ``
    const params = undefined
    executeQuery(db, sql, params)
    expect(db.all).toBeCalledWith(sql, [], expect.any(Function))
    expect(db.all).toBeCalledTimes(1)
  })
  test('If db call returns error, error is thrown', async () => {
    const sql = ``
    expect(await executeQuery(db, sql).catch((e) => e)).toMatchInlineSnapshot(
      `[Error: SQLITE_MISUSE: not an error]`
    )
  })
})

test('executeUpdate: Called with undefined params calls db.run with empty object.', () => {
  const db = {
    run: jest.fn((sql, params, callback) => [])
  }
  const sql = ``
  const params = undefined
  executeUpdate(db, sql, params)
  expect(db.run).toBeCalledWith(sql, [], expect.any(Function))
  expect(db.run).toBeCalledTimes(1)
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
  test(`Running the constructor with an id that's already been loaded into memory throws an error.`, () => {
    let error = null
    try {
      const localInstance = new TestModel(testInstanceId)
    } catch (e) {
      error = e
    }
  })
  test(`Running the constructor with an id that's not a number throws an error.`, () => {
    let error = null
    try {
      const localInstance = new TestModel(`This isn't a number.`)
    } catch (e) {
      error = e
    }
    expect(error).toMatchInlineSnapshot(
      `[Error: Must provide an id (Type of Number) as selector.]`
    )
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
    expect(
      await TestModel.get(`a bad id`).catch((e) => e)
    ).toMatchInlineSnapshot(
      `[Error: Must provide an id (Type of Number) as selector.]`
    )
  })
  test(`get throws error if the id doesn't existing in the database`, async () => {
    expect(await TestModel.get(123).catch((e) => e)).toMatchInlineSnapshot(
      `[Error: There is no test with id# 123.]`
    )
  })
  test('update sets field to new value', async () => {
    const newValue = `newTestValue`
    const result = await testInstance.update(1, 'testField', newValue)
    expect(result).toBe(newValue)
  })
  test('update throws exception on sqlite error', async () => {
    expect(await testInstance.update().catch((e) => e)).toMatchInlineSnapshot(
      `[Error: SQLITE_ERROR: no such column: undefined]`
    )
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
