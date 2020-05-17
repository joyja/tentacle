class UserDefinedType extends Model {
  static create(name, description) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      createdOn,
    }
    return super.create(fields)
  }
  async init(async) {
    const result = await super.init(async)
    this._name = result.name
    this._description = result.description
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value, Tag).then(
      (result) => (this._name = result)
    )
  }
  get description() {
    this.checkInit()
    return this._description
  }
  setDescription(value) {
    return this.update(this.id, 'description', value, Tag).then(
      (result) => (this._description = result)
    )
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
}
UserDefinedType.table = 'udt'
UserDefinedType.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
]
UserDefinedType.instances = []
UserDefinedType.initialized = false

class UserDefinedTypeMember extends Model {
  static create(
    name,
    description,
    value,
    scanClass,
    createdBy,
    datatype,
    max,
    min,
    units
  ) {
    const createdOn = getUnixTime(new Date())
    const fields = {
      name,
      description,
      value,
      scanClass,
      createdBy,
      createdOn,
      datatype,
      max,
      min,
      units,
    }
    return super.create(fields)
  }
  async init(async) {
    const result = await super.init(async)
    this._name = result.name
    this._description = result.description
    this._value = result.value
    this._datatype = result.datatype
    this._scanClass = result.scanClass
    this._createdBy = result.createdBy
    this._createdOn = result.createdOn
    this._datatype = result.datatype
    this._max = result.max
    this._min = result.min
    this._units = result.units
  }
  get name() {
    this.checkInit()
    return this._name
  }
  setName(value) {
    return this.update(this.id, 'name', value, Tag).then(
      (result) => (this._name = result)
    )
  }
  get description() {
    this.checkInit()
    return this._description
  }
  setDescription(value) {
    return this.update(this.id, 'description', value, Tag).then(
      (result) => (this._description = result)
    )
  }
  get value() {
    this.checkInit()
    if (this.datatype === 'INT32') {
      return parseInt(this._value)
    } else {
      return this._value
    }
  }
  async setValue(value, write = true) {
    this.checkInit()
    if (this.source && write) {
      this.source.write(value)
    }
    return this.update(this.id, 'value', value, Tag).then((result) => {
      this._value = result
      this.pubsub.publish('tagUpdate', { tagUpdate: this })
    })
  }
  get createdOn() {
    this.checkInit()
    return fromUnixTime(this._createdOn)
  }
  get datatype() {
    this.checkInit()
    return this._datatype
  }
  setDatatype(datatype) {
    this.checkInit()
    return this.update(this.id, 'datatype', datatype, Tag).then(
      (result) => (this._datatype = result)
    )
  }
  get max() {
    this.checkInit()
    return this._max
  }
  setMax(value) {
    this.checkInit()
    return this.update(this.id, 'max', value, Tag).then(
      (result) => (this._max = result)
    )
  }
  get min() {
    this.checkInit()
    return this._min
  }
  setMin(value) {
    this.checkInit()
    return this.update(this.id, 'min', value, Tag).then(
      (result) => (this._min = result)
    )
  }
  get units() {
    this.checkInit()
    return this._units
  }
  setUnits(value) {
    this.checkInit()
    return this.update(this.id, 'units', value, Tag).then(
      (result) => (this._units = result)
    )
  }
}
UserDefinedTypeMember.table = 'udtMember'
UserDefinedTypeMember.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'scanClass', colRef: 'scanClass', onDelete: 'CASCADE' },
  { colName: 'value', colType: 'TEXT' },
  { colName: 'createdBy', colRef: 'user', onDelete: 'SET NULL' },
  { colName: 'createdOn', colType: 'INTEGER' },
  { colName: 'datatype', colType: 'TEXT' },
  { colName: 'units', colType: 'TEXT' },
  { colName: 'quality', colType: 'TEXT' },
  { colName: 'max', colType: 'REAL' },
  { colName: 'min', colType: 'REAL' },
]
UserDefinedType.instances = []
UserDefinedType.initialized = false

class UserDefinedTypeInstance extends Model {}
UserDefinedTypeInstance.table = 'udtInstance'
UserDefinedTypeInstance.fields = [
  { colName: 'udt', colRef: 'udt', onDelete: 'CASCADE' },
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
]

module.exports = {
  UserDefinedType,
  UserDefinedTypeMember,
}
