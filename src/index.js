const sqlite3 = require('sqlite3').verbose()
const { GraphQLServer, PubSub } = require('graphql-yoga')
const resolvers = require('./resolvers')
const { User, Tag, ScanClass, Device, Service } = require('./relations')

// Create database
const db = new sqlite3.cached.Database('./database/spread-edge.db', (error) => {
  if (error) {
    throw error
  }
  console.log('Connected to sqlite.')
})
const pubsub = new PubSub()
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  context: (req) => ({
    ...req,
    pubsub,
    db,
    users: User.instances,
    tags: Tag.instances,
    scanClasses: ScanClass.instances,
    devices: Device.instances,
    services: Service.instances
  })
})

server
  .start(async () => {
    const context = server.context()
    await context.db.get('PRAGMA foreign_keys = ON')
    //Check for administrator account and initialize one if it doesn't exist.
    await User.initialize(context.db, context.pubsub)
    await Tag.initialize(context.db, context.pubsub)
    await Device.initialize(context.db, context.pubsub)
    await Service.initialize(context.db, context.pubsub)
    for (device of Device.instances) {
      await device.config.connect().catch((error) => {
        throw error
      })
    }
    for (service of Service.instances) {
      await service.config.connect()
    }
    for (scanClass of ScanClass.instances) {
      await scanClass.startScan()
    }
  })
  .then((server) => {
    process.on('SIGINT', () => {
      console.log(`Closing database and server connections.`)
      ScanClass.instances.forEach((instance) => {
        instance.stopScan()
      })
      Device.instances.forEach((instance) => {
        instance.config.disconnect()
      })
      Service.instances.forEach((instance) => {
        instance.config.disconnect()
      })
      db.close()
      server.close()
    })
  })
