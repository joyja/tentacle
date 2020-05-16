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
