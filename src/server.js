#!/usr/bin/env node

const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const { GraphQLServer, PubSub } = require('graphql-yoga')
const resolvers = require('./resolvers')
const { User, Tag, ScanClass, Device, Service } = require('./relations')

let db = undefined
let httpServer = undefined
let server = undefined
start = async function(dbFilename, inMemory = false) {
  // Create database
  if (inMemory) {
    db = new sqlite3.Database(`:memory:`, (error) => {
      if (error) {
        throw error
      }
    })
  } else {
    db = new sqlite3.cached.Database(`./database/${dbFilename}`, (error) => {
      if (error) {
        throw error
      }
    })
  }
  const pubsub = new PubSub()
  server = new GraphQLServer({
    typeDefs: path.join(__dirname, '/schema.graphql'),
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

  await new Promise(async (resolve, reject) => {
    httpServer = await server.start(async () => {
      const context = server.context()
      await context.db.get('PRAGMA foreign_keys = ON')
      //Check for administrator account and initialize one if it doesn't exist.
      await User.initialize(context.db, context.pubsub)
      await Tag.initialize(context.db, context.pubsub)
      await Device.initialize(context.db, context.pubsub)
      await Service.initialize(context.db, context.pubsub)
      for (device of Device.instances) {
        await device.config.connect()
      }
      for (service of Service.instances) {
        await service.config.connect()
      }
      for (scanClass of ScanClass.instances) {
        await scanClass.startScan()
      }
      resolve()
    })
  })
  process.on('SIGINT', async () => {
    await stop()
  })
}

stop = async function() {
  ScanClass.instances.forEach((instance) => {
    instance.stopScan()
  })
  Device.instances.forEach((instance) => {
    instance.config.disconnect()
  })
  Service.instances.forEach((instance) => {
    instance.config.disconnect()
  })
  try {
    db.close()
  } catch (error) {}
  httpServer.close()
}

module.exports = { start, stop }
