#!/usr/bin/env node

const http = require('http')
const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const { ApolloServer, PubSub, gql } = require('apollo-server-express')
const resolvers = require('./resolvers')
const { User, Tag, ScanClass, Device, Service } = require('./relations')
const { executeQuery } = require('./database/model')
const fs = require('fs')
const logger = require('./logger')

const app = express()

const desiredUserVersion = 7

let db = undefined
let httpServer = undefined
let server = undefined
start = async function (dbFilename) {
  const dir = './database'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  let fileExisted = false
  // Create database
  if (dbFilename === `:memory:`) {
    db = new sqlite3.Database(`:memory:`, (error) => {
      if (error) {
        throw error
      }
    })
  } else {
    if (fs.existsSync(`${dir}/${dbFilename}.db`)) {
      fileExisted = true
    }
    db = new sqlite3.cached.Database(`${dir}/${dbFilename}.db`, (error) => {
      if (error) {
        throw error
      }
    })
  }
  const pubsub = new PubSub()
  server = new ApolloServer({
    typeDefs: gql`
      ${fs.readFileSync(__dirname.concat('/schema.graphql'), 'utf8')}
    `,
    resolvers,
    subscriptions: {
      path: '/',
    },
    context: (req) => ({
      ...req,
      request: req,
      pubsub,
      db,
      users: User.instances,
      tags: Tag.instances,
      scanClasses: ScanClass.instances,
      devices: Device.instances,
      services: Service.instances,
    }),
  })
  server.applyMiddleware({ app, path: '/' })

  httpServer = http.createServer(app)
  server.installSubscriptionHandlers(httpServer)

  await new Promise(async (resolve, reject) => {
    httpServer.listen(4000, async () => {
      const context = server.context()
      await executeQuery(context.db, 'PRAGMA foreign_keys = ON', [], true)
      const { user_version: userVersion } = await executeQuery(
        context.db,
        'PRAGMA user_version',
        [],
        true
      )
      if (
        dbFilename !== ':memory:' &&
        fileExisted &&
        userVersion !== desiredUserVersion
      ) {
        fs.copyFileSync(
          `${dir}/${dbFilename}.db`,
          `${dir}/${dbFilename}-backup-${new Date().toISOString()}.db`
        )
      }
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
      await context.db.get(`PRAGMA user_version = ${desiredUserVersion}`)
      resolve()
    })
  })
  process.on('SIGINT', async () => {
    await stop()
  })
}

stop = async function () {
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
