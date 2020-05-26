const template = function (parent, args, context, info) {
  return context.deviceConfig.tagList.templates[parent.type.code]
}

module.exports = {
  template,
}
