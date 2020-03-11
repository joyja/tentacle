const recordCount = async function(parent, args, context, info) {
  console.log(await parent.getRecordCount())
  return parent.getRecordCount()
}

module.exports = {
  recordCount
}
