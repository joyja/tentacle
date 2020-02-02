const { User, Tag, ScanClass } = require('../../relations')

async function createScanClass(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const scanClass = await ScanClass.create(args.rate, createdBy).catch(
    (error) => {
      throw error
    }
  )
  scanClass.startScan()
  return scanClass
}

async function updateScanClass(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const scanClass = ScanClass.findById(args.id)
  if (scanClass) {
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
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const scanClass = ScanClass.findById(args.id)
  if (scanClass) {
    return scanClass.delete()
  } else {
    throw new Error(`Scan Class with id ${args.id} does not exist.`)
  }
}

async function createTag(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const createdBy = user.id
  const tag = await Tag.create(
    args.name,
    args.description,
    args.value,
    args.scanClassId,
    createdBy,
    args.datatype
  ).catch((error) => {
    throw error
  })
  return tag
}

async function updateTag(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
  const tag = Tag.findById(args.id)
  if (tag) {
    if (args.name) {
      await tag.setName(args.name)
    }
    if (args.description) {
      await tag.setDescription(args.description)
    }
    if (args.value) {
      await tag.setValue(args.value)
    }
    if (args.scanClassId) {
      await tag.setScanClass(args.scanClassId)
    }
    return tag
  } else {
    throw new Error(`Tag with id ${args.id} does not exist.`)
  }
}

async function deleteTag(root, args, context, info) {
  const user = await User.getUserFromContext(context).catch((error) => {
    throw error
  })
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
  deleteTag
}
