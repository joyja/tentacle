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

class UserDefinedTypeMember extends Model {}
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
