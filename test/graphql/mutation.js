const fragment = require('./fragment')

const createTag = `
  mutation CreateTag(
      $name: String!
      $description: String!
      $value: String!
      $datatype: Datatype!
      $scanClassId: ID!
      $max: Float
      $min: Float
      $units: String
    ) {
    createTag(
      name: $name
      description: $description
      value: $value
      datatype: $datatype
      scanClassId: $scanClassId
      max: $max
      min: $min
      units: $units
    ) {
      ...FullTag
    }
  }
  ${fragment.tag}
`

const updateTag = `mutation UpdateTag(
  $id: ID!, 
  $name: String
  $description: String
  $datatype: Datatype
  $value: String
  $max: Float
  $min: Float
  $units: String
) {
  updateTag(
    id: $id, 
    name: $name
    description: $description
    datatype: $datatype
    value: $value
    max: $max
    min: $min
    units: $units
  ) {
    ...FullTag
  }
}
${fragment.tag}`

const deleteTag = `mutation DeleteTag(
  $id: ID!, 
) {
  deleteTag(
    id: $id, 
  ) {
    ...FullTag
  }
}
${fragment.tag}`

const createModbus = `mutation CreateModbus (
  $name: String!
  $description: String!
  $host: String!
  $port: Int!
  $reverseBits: Boolean!
  $reverseWords: Boolean!
  $zeroBased: Boolean!
  $timeout: Int!
  $retryRate: Int!
){
  createModbus(
    name: $name
    description: $description
    host: $host
    port: $port
    reverseBits: $reverseBits
    reverseWords: $reverseWords
    zeroBased: $zeroBased
    timeout: $timeout
    retryRate: $retryRate
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const updateModbus = `mutation UpdateModbus (
  $id: ID!
  $name: String
  $description: String
  $host: String
  $port: Int
  $reverseBits: Boolean
  $reverseWords: Boolean
  $zeroBased: Boolean
  $timeout: Int
  $retryRate: Int
){
  updateModbus(
    id: $id
    name: $name
    description: $description
    host: $host
    port: $port
    reverseBits: $reverseBits
    reverseWords: $reverseWords
    zeroBased: $zeroBased
    timeout: $timeout
    retryRate: $retryRate
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const deleteModbus = `mutation DeleteModbus (
  $id: ID!
){
  deleteModbus(
    id: $id
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const createEthernetIP = `mutation CreateEthernetIP (
  $name: String!
  $description: String!
  $host: String!
  $slot: Int!
){
  createEthernetIP(
    name: $name
    description: $description
    host: $host
    slot: $slot
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const updateEthernetIP = `mutation UpdateEthernetIP (
  $id: ID!
  $name: String
  $description: String
  $host: String
  $slot: Int
){
  updateEthernetIP(
    id: $id
    name: $name
    description: $description
    host: $host
    slot: $slot
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const deleteEthernetIP = `mutation DeleteEthernetIP (
  $id: ID!
){
  deleteEthernetIP(
    id: $id
  ) {
    ... FullDevice
  }
}
${fragment.device}`

const createMqtt = `mutation CreateMqtt (
    $name: String!
    $description: String!
    $host: String! 
    $port: Int!
    $group: String!
    $node: String!
    $username: String!
    $password: String!
    $devices: [ID!]!
    $rate: Int!
    $encrypt: Boolean!
    $recordLimit: Int!
    $primaryHosts: [String!]
){
  createMqtt(
    name: $name
    description: $description
    host: $host 
    port: $port
    group: $group
    node: $node
    username: $username
    password: $password
    devices: $devices
    rate: $rate
    encrypt: $encrypt
    recordLimit: $recordLimit
    primaryHosts: $primaryHosts
  ) {
    ... FullService
  }
}
${fragment.service}`

const updateMqtt = `mutation UpdateMqtt (
  $id: ID!
  $name: String
  $description: String
  $host: String 
  $port: Int
  $group: String
  $node: String
  $username: String
  $password: String
  $rate: Int
  $encrypt: Boolean
  $recordLimit: Int
){
  updateMqtt(
    id: $id
    name: $name
    description: $description
    host: $host 
    port: $port
    group: $group
    node: $node
    username: $username
    password: $password
    rate: $rate
    encrypt: $encrypt
    recordLimit: $recordLimit
  ) {
    ... FullService
  }
}
${fragment.service}`

const deleteMqtt = `mutation DeleteMqtt (
  $id: ID!
){
  deleteMqtt(
    id: $id
  ) {
    ... FullService
  }
}
${fragment.service}`

module.exports = {
  createTag,
  updateTag,
  deleteTag,
  createModbus,
  updateModbus,
  deleteModbus,
  createEthernetIP,
  updateEthernetIP,
  deleteEthernetIP,
  createMqtt,
  updateMqtt,
  deleteMqtt
}
