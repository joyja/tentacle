const id = function (parent, args, context, info) {
  return parent.nodeId
}

const name = function (parent, args, context, info) {
  return parent.browseName
}

const children = function (parent, args, context, info) {
  const hasProperty = parent.hasProperty ? parent.hasProperty : []
  const hasComponent = parent.hasComponent ? parent.hasComponent : []
  const organizes = parent.organizes ? parent.organizes : []
  const hasInputVar = parent.hasInputVar ? parent.hasInputVar : []
  const hasOutputVar = parent.hasOutputVar ? parent.hasOutputVar : []
  const hasLocalVar = parent.hasLocalVar ? parent.hasLocalVar : []
  return [
    ...hasProperty,
    ...hasComponent,
    ...organizes,
    ...hasInputVar,
    ...hasOutputVar,
    ...hasLocalVar,
  ]
}

const datatype = function (parent, args, context, info) {
  return parent.dataValue && parent.dataValue.value
    ? parent.dataValue.value.dataType
    : null
}

const value = function (parent, args, context, info) {
  return parent.dataValue && parent.dataValue.value
    ? JSON.stringify(parent.dataValue.value.value)
    : null
}

module.exports = {
  id,
  name,
  children,
  datatype,
  value,
}
