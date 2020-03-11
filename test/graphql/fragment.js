const scalarTag = `
  fragment ScalarTag on Tag {
    id
    name
    description
    datatype
    value
    createdBy {
      id
      username
    }
    createdOn
    max
    min
    units
  }
`

const scalarScanClass = `
fragment ScalarScanClass on ScanClass {
  id
  name
  description
  rate
}
`

const tag = `
  fragment FullTag on Tag {
    ...ScalarTag
    scanClass {
      ...ScalarScanClass
    }
  }
  ${scalarTag}
  ${scalarScanClass}
`

const scanClass = `
fragment FullScanClass on ScanClass {
  id
  rate
  tags {
    ...scalarTag
  }
}
${scalarTag}  
`
const device = `
  fragment FullDevice on Device {
    id
    name
    description
    createdBy {
      id
      username
    }
    createdOn
    config {
      ... on Modbus {
        id
        host
        port
        reverseBits
        reverseWords
        status
        zeroBased
        timeout
        sources {
          tag {
            ...ScalarTag
          }
        }
      }
    }
    config {
      ... on EthernetIP {
        id
        host
        slot
        sources {
          tag {
            ...ScalarTag
          }
          tagname
        }
        status
      }
    }
  }
  ${scalarTag}
`

const service = `
  fragment FullService on Service {
    id
    name
    description
    createdBy {
      id
      username
    }
    createdOn
    config {
      ... on Mqtt {
        id
        host
        port
        group
        node
        username
        password
        rate
        encrypt
        recordLimit
        primaryHosts {
          id
          name
          status
        }
        sources {
          device {
            id
          }
        }
      }
    }
  }
`

module.exports = {
  tag,
  scanClass,
  device,
  service
}
