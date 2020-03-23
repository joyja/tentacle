const deviceUpdate = {
  subscribe: (root, args, context) => {
    return context.pubsub.asyncIterator(`deviceUpdate`)
  }
}

module.exports = {
  deviceUpdate
}
