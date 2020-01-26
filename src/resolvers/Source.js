async function __resolveType(parent, args, context, info) {
  return parent.constructor.name
}

module.exports = {
  __resolveType
}
