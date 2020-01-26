const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3')

async function createTestDb(filename) {
  const filePath = path.join(__dirname, '..', 'database', 'spread-edge.db')
  const testFilePath = path.join(__dirname, '..', 'database', filename)
  await new Promise((resolve, reject) => {
    fs.unlink(testFilePath, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  }).catch((error) => {})
  await new Promise((resolve, reject) => {
    fs.copyFile(filePath, testFilePath, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  }).catch((error) => {
    throw error
  })
  const db = await new Promise((resolve, reject) => {
    const database = new sqlite3.Database(
      testFilePath,
      sqlite3.OPEN_READWRITE,
      (error) => {
        if (error) {
          reject(error.message)
        } else {
          resolve(database)
        }
      }
    )
  })
  const sql = `SELECT * FROM sqlite_master where type='table'`
  const params = []
  const rows = await new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error.message)
      } else {
        resolve(rows)
      }
    })
  }).catch((error) => {
    throw error
  })
  await Promise.all(
    rows.map((row) => {
      const sql = `DELETE FROM ${row.name}`
      return new Promise((resolve, reject) => {
        db.run(sql, [], (error) => {
          if (error) {
            reject(error.message)
          } else {
            resolve()
          }
        })
      })
    })
  ).catch((error) => {
    throw error
  })
  await new Promise((resolve, reject) => {
    const database = db
    database.get('PRAGMA foreign_keys = ON', (error) => {
      if (error) {
        reject(error.message)
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
}

module.exports = {
  createTestDb,
  deleteTestDb
}
