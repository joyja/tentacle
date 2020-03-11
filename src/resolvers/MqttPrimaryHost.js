const recordCount = function(parent, args, context, info) {
  console.log(parent)
  return parent.getRecordCount()
}

module.exports = {
  recordCount
}
