#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose()
const { GraphQLServer, PubSub } = require('graphql-yoga')
const resolvers = require('./resolvers')
const { User, Tag, ScanClass, Device, Service } = require('./relations')

start = async function(inMemory = false) {
  // Create database
  let db = undefined
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

  await new Promise((resolve, reject) => {
    server
      .start(async () => {
        const context = server.context()
        await context.db.get('PRAGMA foreign_keys = ON')
        //Check for administrator account and initialize one if it doesn't exist.
        await User.initialize(context.db, context.pubsub).catch((error) => {
          reject(error)
          return
        })
        await Tag.initialize(context.db, context.pubsub).catch((error) => {
          reject(error)
          return
        })
        await Device.initialize(context.db, context.pubsub).catch((error) => {
          reject(error)
          return
        })
        await Service.initialize(context.db, context.pubsub).catch((error) => {
          reject(error)
          return
        })
        for (device of Device.instances) {
          await device.config.connect().catch((error) => {
            reject(error)
            return
          })
        }
        for (service of Service.instances) {
          await service.config.connect()
        }
        for (scanClass of ScanClass.instances) {
          await scanClass.startScan()
        }
        resolve()
      })
      .catch((error) => {
        throw error
      })
  })
  process.on('SIGINT', () => {
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
}

module.exports = start
