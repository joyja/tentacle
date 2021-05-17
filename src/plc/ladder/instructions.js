const { Model } = require(`../../database`)
const { Tag } = require(`./tags`)

class Instruction extends Model {
  static async getAll(db, pubsub) {
    const instances = await super.getAll(db, pubsub, Instruction)
    await Promise.all(
      instances.map(async (instance) => {
        return instance.getAssignments()
      })
    )
    return instances
  }
  static async create(rung, sort, action, assignments) {
    // assignments is an array of objects with the structure: {param: String, root: Number, parent: Number, tag: Number, ...}
    const fields = {
      rung,
      sort,
      action,
    }
    const instruction = await super.create(db, pubsub, fields, Instruction)
    await instruction.setAssignments(assignments)
    await instruction.getAssignments()
    return instruction
  }
  async setAssignments(assignments) {
    assignments.forEach(async (assignment) => {
      const sql = `INSERT INTO assignments (instruction, param, root, parent, tag) VALUES (?,?,?,?,?)`
      const result = await this.executeUpdate(this.db, sql, [
        this.id,
        assignment.param,
        assignment.root,
        assignment.parent,
        assignment.tag,
      ])
      return result.lastID
    })
  }
  async getAssignments() {
    let sql = `SELECT * FROM assignments WHERE instruction=?`
    if (this._actionName === 'BST') {
      sql = `SELECT idx FROM branch WHERE start=?`
    } else if (this._actionName === 'BND') {
      sql = `SELECT idx FROM branch WHERE end=?`
    }

    const result = await this.executeQuery(this.db, sql, [this.id])

    if (this._actionName === `XIC`) {
      this._action = new XIC(result, this)
    } else if (this._actionName === `XIO`) {
      this._action = new XIO(result, this)
    } else if (this._actionName === `OTE`) {
      this._action = new OTE(result, this)
    } else if (this._actionName === `BST`) {
      this._action = new BST(result, this)
    } else if (this._actionName === `BND`) {
      this._action = new BND(result, this)
    }
  }
}
Instruction.table = `instruction`
Instruction.fields = [
  { colName: 'branch', colRef: 'branch', onDelete: 'CASCADE' },
  { colName: 'sort', colType: 'INTEGER' },
  { colName: 'action', colType: 'VARCHAR' },
]
Instruction.instances = []
Instruction.initialized = false

class XIC {
  constructor(param, instruction) {
    if (param.length === 1) {
      this.name = 'XIC'
      const assigned = Tag.getParam(param[0])
      if (assigned.datatype.name !== 'Boolean') {
        throw Error(`XIC tag must be Boolean`)
      }
      this.tag = assigned
      this.terminating = false
      this.instruction = instruction
    } else if (param.length < 1) {
      throw Error(
        `A tag must be assigned the the tag parameter of an XIC. There were zero tags assigned.`
      )
    } else {
      throw Error(
        `There is more than one tag assigned to this XIC. That shouldn't be possible.`
      )
    }
  }
  evaluate(input) {
    this.input = input
    this.output = input && this.tag.value === true
    this.instruction.pubsub.publish('instructionState', {
      instructionState: this.instruction,
    })
    return this.output
  }
}

class XIO {
  constructor(param, instruction) {
    if (param.length === 1) {
      this.name = 'XIO'
      const assigned = Tag.getParam(param[0])
      if (assigned.datatype.name !== 'Boolean') {
        throw Error(`XIC tag must be Boolean`)
      }
      this.tag = assigned
      this.terminating = false
      this.instruction = instruction
    } else if (param.length < 1) {
      throw Error(
        `A tag must be assigned the the tag parameter of an XIC. There were zero tags assigned.`
      )
    } else {
      throw Error(
        `There is more than one tag assigned to this XIC. That shouldn't be possible.`
      )
    }
  }
  evaluate(input) {
    this.input = input
    this.output = input && this.tag.value === false
    this.instruction.pubsub.publish('instructionState', {
      instructionState: this.instruction,
    })
    return this.output
  }
}

class OTE {
  constructor(param, instruction) {
    this.name = 'OTE'
    if (param.length === 1) {
      const assigned = Tag.getParam(param[0])
      if (assigned.datatype.name !== 'Boolean') {
        throw Error(`OTE tag must be Boolean`)
      }
      this.tag = assigned
      this.terminating = true
      this.instruction = instruction
    } else if (param.length < 1) {
      throw Error(
        `A tag must be assigned the the tag parameter of an OTE. There were zero tags assigned.`
      )
    } else {
      throw Error(
        `There is more than one tag assigned to this OTE. That shouldn't be possible.`
      )
    }
  }
  evaluate(input) {
    this.input = input
    Tag.setValue(this.instruction.db, this.instruction.pubsub, this.tag, input)
    this.output = true
    this.instruction.pubsub.publish('instructionState', {
      instructionState: this.instruction,
    })
    return true
  }
}

class BST {
  constructor(param, instruction) {
    this.name = 'BST'
    this.branch = param[0].idx
    this.terminating = false
    this.instruction = instruction
  }
  get instructions() {
    const instructions = [
      ...Instruction.instances
        .filter((instruction) => {
          return instruction.branch === this.branch
        })
        .sort((a, b) => a.sort - b.sort),
    ]
    return instructions
  }
  evaluate(input) {
    let branchInput = input
    this.input = input
    this.output = input
    this.instructions.forEach((instruction) => {
      branchInput = instruction.action.evaluate(branchInput)
    })
    this.result = branchInput
    this.instruction.pubsub.publish('instructionState', {
      instructionState: this.instruction,
    })
    return input
  }
}

class BND {
  constructor(param, instruction) {
    this.name = 'BND'
    this.branch = param[0].idx
    this.terminating = false
    this.instruction = instruction
  }
  get bst() {
    return Instruction.instances.find((instruction) => {
      if (instruction.action.name === 'BST') {
        return instruction.action.branch === this.branch
      }
    })
  }
  evaluate(input) {
    this.input = input
    this.result = this.bst.action.result
    this.output = this.bst.action.result || input
    this.instruction.pubsub.publish('instructionState', {
      instructionState: this.instruction,
    })
    return this.output
  }
}

module.exports = {
  Instruction,
  XIO,
  XIC,
  BST,
  BND,
  OTE,
}
