const recordCount = async function(parent, args, context, info) {
  console.log(parent.getRecordCount)
  return parent.getRecordCount()
}

module.exports = {
  recordCount
}
