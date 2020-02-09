const fragment = require('./fragment')

const tags = `
  query Tags {
    tags {
      ...FullTag
    }
  }
  ${fragment.tag}
`

const devices = `
  query Devices {
    devices {
      ...FullDevice
    }
  }
  ${fragment.device}
`

const services = `
  query Services {
    services {
      ...FullService
    }
  }
  ${fragment.service}
`
module.exports = {
  tags,
  devices,
  services
}
