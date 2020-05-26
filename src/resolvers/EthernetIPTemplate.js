const members = function (parent, args, context, info) {
  // console.log(parent._members.map((member) => member.name))
  return parent._members
}

const attributes = function (parent, args, context, info) {
  return parent._attributes
}

module.exports = {
  members,
  attributes,
}
