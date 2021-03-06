const { User, Tag, ScanClass } = require('../../relations')

async function createScanClass(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const createdBy = user.id
  const scanClass = await ScanClass.create(
    args.name,
    args.description,
    args.rate,
    createdBy
  )
  scanClass.startScan()
  return scanClass
}

async function updateScanClass(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const scanClass = ScanClass.findById(args.id)
  if (scanClass) {
    if (args.name) {
      await scanClass.setName(args.name)
    }
    if (args.description) {
      await scanClass.setDescription(args.description)
    }
    if (args.rate) {
      await scanClass.setRate(args.rate)
    }
    scanClass.stopScan()
    scanClass.startScan()
    return scanClass
  } else {
    throw new Error(`Scan Class with id ${args.id} does not exist.`)
  }
}

async function deleteScanClass(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const scanClass = ScanClass.findById(args.id)
  if (scanClass) {
    scanClass.stopScan()
    return scanClass.delete()
  } else {
    throw new Error(`Scan Class with id ${args.id} does not exist.`)
  }
}

async function createTag(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const createdBy = user.id
  const tag = await Tag.create(
    args.name,
    args.description,
    args.value,
    args.scanClassId,
    createdBy,
    args.datatype,
    args.max,
    args.min,
    args.deadband,
    args.units
  )
  return tag
}

async function updateTag(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const tag = Tag.findById(args.id)
  if (tag) {
    if (args.name) {
      await tag.setName(args.name)
    }
    if (args.description) {
      await tag.setDescription(args.description)
    }
    if (args.datatype) {
      await tag.setDatatype(args.datatype)
    }
    if (args.value) {
      await tag.setValue(args.value)
    }
    if (args.scanClassId) {
      await tag.setScanClass(args.scanClassId)
    }
    if (args.min !== undefined) {
      await tag.setMin(args.min)
    }
    if (args.max !== undefined) {
      await tag.setMax(args.max)
    }
    if (args.deadband !== undefined) {
      await tag.setDeadband(args.deadband)
    }
    if (args.units) {
      await tag.setUnits(args.units)
    }
    return tag
  } else {
    throw new Error(`Tag with id ${args.id} does not exist.`)
  }
}

async function deleteTag(root, args, context, info) {
  const user = await User.getUserFromContext(context)
  const tag = Tag.findById(args.id)
  if (tag) {
    return tag.delete()
  } else {
    throw new Error(`Tag with id ${args.id} does not exist.`)
  }
}

module.exports = {
  createScanClass,
  updateScanClass,
  deleteScanClass,
  createTag,
  updateTag,
  deleteTag,
}
