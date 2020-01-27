const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')

async function createTestDb(filename) {
  const filePath = path.join(__dirname, '..', 'database', filename)
  const db = await new Promise((resolve, reject) => {
    const database = new sqlite3.cached.Database(
      filePath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (error) => {
        if (error) {
          throw error
        } else {
          resolve(database)
        }
      }
    )
  })
  await new Promise((resolve, reject) => {
    const database = db
    database.get('PRAGMA foreign_keys = ON', (error) => {
      if (error) {
        throw error
      } else {
        resolve()
      }
    })
  }).catch((error) => {
    throw error
  })
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
    await new Promise((resolve, reject) => {
      fs.unlink(db.filename, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    }).catch((error) => {
      throw error
    })
  } else {
    console.log(db)
  }
}

module.exports = {
  createTestDb,
  deleteTestDb
}
