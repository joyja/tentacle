const serviceUpdate = {
  subscribe: (root, args, context) => {
    return context.pubsub.asyncIterator(`serviceUpdate`)
  }
}

module.exports = {
  serviceUpdate
}
