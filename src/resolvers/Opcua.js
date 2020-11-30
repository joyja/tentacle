const nodes = async function (parent, args, context, info) {
  return parent.browse()
}

const flatNodes = async function (parent, args, context, info) {
  return parent.browse(null, true)
}

module.exports = {
  nodes,
  flatNodes,
}
