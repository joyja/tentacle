const tagUpdate = {
  subscribe: (root, args, context) => {
    return context.pubsub.asyncIterator(`tagUpdate`)
  },
}

module.exports = {
  tagUpdate,
}
