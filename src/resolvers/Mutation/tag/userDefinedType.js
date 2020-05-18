const {
  User,
  UserDefinedType,
  UserDefinedTypeMember,
} = require('../../../relations')

async function createUserDefinedType(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const createdBy = user.id
  const udt = await UserDefinedType.create(
    args.name,
    args.description,
    createdBy
  )
  return udt
}

async function updateUserDefinedType(root, args, context, info) {
  await User.getUserFromContext(context)
  const udt = UserDefinedType.findById(args.id)
  if (udt) {
    if (args.name) {
      await udt.setName(args.name)
    }
    if (args.description) {
      await udt.setDescription(args.description)
    }
    return udt
  } else {
    throw new Error(`User Defined Type with id ${args.id} does not exist.`)
  }
}

async function deleteUserDefinedType(root, args, context, info) {
  await User.getUserFromContext(context)
  const udt = UserDefinedType.findById(args.id)
  if (udt) {
    return UserDefinedType.delete()
  } else {
    throw new Error(`User Defined Type with id ${args.id} does not exist.`)
  }
}
async function createUserDefinedTypeMember(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const createdBy = user.id
  const udtMember = await UserDefinedTypeMember.create(
    args.userDefinedTypeId,
    args.name,
    args.description,
    args.value,
    args.scanClassId,
    createdBy,
    args.datatype,
    args.max,
    args.min,
    args.units
  )
  return udtMember
}

async function updateUserDefinedTypeMember(root, args, context, info) {
  await User.getUserFromContext(context)
  const udtMember = UserDefinedTypeMember.findById(args.id)
  if (udtMember) {
    if (args.name) {
      await udtMember.setName(args.name)
    }
    if (args.description) {
      await udtMember.setDescription(args.description)
    }
    if (args.datatype) {
      await udtMember.setDatatype(args.datatype)
    }
    if (args.value) {
      await udtMember.setValue(args.value)
    }
    if (args.scanClassId) {
      await udtMember.setScanClass(args.scanClassId)
    }
    if (args.min) {
      await udtMember.setMin(args.min)
    }
    if (args.max) {
      await udtMember.setMax(args.max)
    }
    if (args.units) {
      await udtMember.setUnits(args.units)
    }
    return udtMember
  } else {
    throw new Error(
      `User Defined Type Member with id ${args.id} does not exist.`
    )
  }
}

async function deleteUserDefinedTypeMember(root, args, context, info) {
  await User.getUserFromContext(context)
  const udtMember = UserDefinedTypeMember.findById(args.id)
  if (udtMember) {
    return udtMember.delete()
  } else {
    throw new Error(
      `User Defined Type Member with id ${args.id} does not exist.`
    )
  }
}

module.exports = {
  createUserDefinedType,
  updateUserDefinedType,
  deleteUserDefinedType,
  createUserDefinedTypeMember,
  updateUserDefinedTypeMember,
  deleteUserDefinedTypeMember,
}
