const template = function (parent, args, context, info) {
  return context.deviceConfig.templates[parent.type.code]
}

module.exports = {
  template,
}
