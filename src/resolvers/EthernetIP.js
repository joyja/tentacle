const tags = function (parent, args, context, info) {
  context.deviceConfig = parent
  return parent.tags
}

module.exports = {
  tags,
}
