const tag = require('./tag')
const userDefinedType = requie('./userDefinedType')

module.exports = {
  ...tag,
  ...userDefinedType,
}
