const { createTestDb, deleteTestDb } = require('../../test/db')
const { User } = require('../relations')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const dbFilename = `test-auth-spread-edge.db`

let db = undefined
beforeAll(async () => {
  db = await createTestDb()
})

afterAll(async () => {
  await deleteTestDb(db)
})

describe(`User:`, () => {
  test(`initialize creates a single user with username: admin, password: password`, async () => {
    pubsub = {}
    await User.initialize(db)
    const user = User.instances[0]
    expect(user.id).toEqual(expect.any(Number))
    expect(user.username).toBe(`admin`)
    expect(await bcrypt.compare(`password`, user.password)).toBe(true)
  })
  test(`if a root user already exists, initialize will not create another root user`, async () => {
    pubsub = {}
    const prevLength = User.instances.length
    await User.initialize(db)
    expect(User.instances.length).toBe(prevLength)
  })
  test(`create: creates a new user.`, async () => {
    const prevLength = User.instances.length
    const user = await User.create(`newUser`, `newPassword`)
    expect(User.instances.length).toBe(prevLength + 1)
    expect(user.username).toBe(`newUser`)
    expect(await bcrypt.compare(`newPassword`, user.password)).toBe(true)
  })
  test(`login with a valid username and password should return a token and the user`, async () => {
    const { token, user } = await User.login(`admin`, `password`)
    expect(token).toEqual(expect.any(String))
    expect(user.username).toBe(`admin`)
    expect(await bcrypt.compare(`password`, user.password)).toBe(true)
  })
  test(`login with an invalid username should throw an error`, async () => {
    expect(
      await User.login(`bogusUsername`, `bogusPassword`).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`login with an invalid password should throw an error`, async () => {
    expect(
      await User.login(`admin`, `bogusPassword`).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: The username or password is incorrect.]`)
  })
  test(`getUserFromContext with approriate authorization token returns a valid user.`, async () => {
    const { token } = await User.login(`admin`, `password`)
    const context = {
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    }
    const user = await User.getUserFromContext(context)
    expect(user.username).toBe(`admin`)
    expect(await bcrypt.compare(`password`, user.password)).toBe(true)
  })
  test(`authorization works with subscription authorization headers.`, async () => {
    const { token } = await User.login(`admin`, `password`)
    const context = {
      connection: {
        context: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
    const user = await User.getUserFromContext(context)
    expect(user.username).toBe(`admin`)
    expect(await bcrypt.compare(`password`, user.password)).toBe(true)
  })
  test(`init gives us the _username and _password fields.`, async () => {
    const { id, username, password } = User.instances[0]
    User.instances = [] // clear out instances to avoid `instance exists error`
    const user = new User(id)
    await user.init()
    expect(user._username).toBe(username)
    expect(user._password).toBe(password)
    await User.getAll() // refresh instances.
  })
  test(`username and password getters return the appropriate underscore fields`, () => {
    const user = User.instances[0]
    expect(user.username).toBe(user._username)
    expect(user.password).toBe(user._password)
  })
  test(`username and password setters return the appropriate underscore fields`, async () => {
    const user = User.instances[0]
    await user.setUsername(`newUsername`)
    await user.setPassword(`newPassword`)
    expect(user.username).toBe(`newUsername`)
    expect(await bcrypt.compare(`newPassword`, user.password)).toBe(true)
    await user.setUsername(`admin`)
    await user.setPassword(`password`)
  })
  test(`change password with invalid old password throws error.`, async () => {
    const { token } = await User.login(`admin`, `password`)
    const context = {
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    }
    expect(
      await User.changePassword(
        context,
        'incorrectPassword',
        'newPassword'
      ).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: Invalid old password.]`)
  })
  test(`change password with valid old password returns valid user.`, async () => {
    const { token } = await User.login(`admin`, `password`)
    const context = {
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    }
    const user = await User.changePassword(context, 'password', 'newPassword')
    expect(await bcrypt.compare(`newPassword`, user.password)).toBe(true)
  })
  test(`getUserFromContext without valid token returns an error.`, async () => {
    const token = jwt.sign(
      {
        userId: 123,
      },
      `aSecret`
    )
    const context = {
      request: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    }
    expect(
      await User.getUserFromContext(context).catch((e) => e)
    ).toMatchInlineSnapshot(`[Error: You are not authorized.]`)
  })
})
