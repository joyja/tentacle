const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')
const { executeQuery } = require('../src/database/model')

async function createTestDb(user_version = 7) {
  const db = await new Promise((resolve, reject) => {
    const database = new sqlite3.Database(':memory:', (error) => {
      if (error) {
        throw error
      } else {
        resolve(database)
      }
    })
  })
  await executeQuery(db, 'PRAGMA foreign_keys = ON')
  await executeQuery(db, `PRAGMA user_version = ${user_version}`)
  return db
}

async function deleteTestDb(db) {
  if (db) {
    await new Promise((resolve, reject) => {
      return db.close((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
    // await new Promise((resolve, reject) => {
    //   fs.unlink(db.filename, (error) => {
    //     if (error) {
    //       reject(error)
    //     } else {
    //       resolve()
    //     }
    //   })
    // }).catch((error) => {
    //   throw error
    // })
  } else {
    console.log(db)
  }
}

module.exports = {
  createTestDb,
  deleteTestDb,
}
