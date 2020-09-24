const recordCount = async function (parent, args, context, info) {
  return parent.getRecordCount()
}

module.exports = {
  recordCount,
}
