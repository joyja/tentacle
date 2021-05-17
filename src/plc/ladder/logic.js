const Model = require('../../database')

class Routine extends Model {
  static async create(name, description, rate = 100) {
    const fields = {
      name,
      description,
      rate,
    }
    return super.create(fields)
  }
  createRung(sort) {
    if (!sort) {
      sort =
        this.rungs.reduce((max, instance) => {
          return instance.sort > max ? instance.sort : max
        }, 0) + 1
    }
    return Rung.create(this.db, this.pubsub, this.id, sort)
  }
  deleteRung(id) {
    return Rung.delete(this.db, id)
  }
  get rungs() {
    return Rung.instances
      .filter((rung) => {
        return rung.routine.id === this.id
      })
      .sort((a, b) => a.sort - b.sort)
  }
  evaluate() {
    this.rungs.forEach((rung) => {
      rung.evaluate()
    })
  }
  startScan() {
    this.interval = setInterval(() => {
      this.evaluate()
    }, this.rate)
  }
  stopScan() {
    clearInterval(this.interval)
  }
}
Routine.table = `routine`
Routine.instances = []
Routine.fields = [
  { colName: 'name', colType: 'TEXT' },
  { colName: 'description', colType: 'TEXT' },
  { colName: 'rate', colType: 'INTEGER' },
]

class Rung extends Model {
  static async create(routine, sort) {
    const sql = `UPDATE rung SET sort = sort + 1 WHERE routine=? AND sort>=?`
    await this.executeUpdate({ sql, params: [routine, sort] })
    const fields = {
      routine,
      sort,
    }
    return super.create(fields)
  }
  static async delete(db, pubsub, selector) {
    const rung = Rung.get(db, pubsub, selector)
    super.delete(db, selector, Rung)
    const sql = `UPDATE rung SET sort = sort - 1 WHERE routine=? AND order>?`
    await this.executeUpdate({
      sql,
      params: [rung.routine.selector, rung.sort],
    })
    return selector
  }
  evaluate() {
    const trunk = this.branches.find((branch) => {
      return branch.rung.id === this.id && !branch.start && !branch.end
    })
    trunk.evaluate()
  }
  get branches() {
    const branches = [
      ...Branch.instances.filter((branch) => {
        return branch.rung.id === this.id
      }),
    ]
    return branches
  }
}
Rung.table = `rung`
Rung.instances = []
Rung.fields = [
  { colName: 'routine', colRef: 'routine', onDelete: 'CASCADE' },
  { colName: 'comment', colType: 'VARCHAR' },
  { colName: 'sort', colType: 'INTEGER' },
]

class Branch extends Model {
  static async create(rung, start, end) {
    const fields = {
      rung,
      start,
      end,
    }
    return super.create(fields)
  }
  createInstruction(sort, action, assignments) {
    if (!sort) {
      sort =
        this.instructions.reduce((max, instance) => {
          return instance.sort > max ? instance.sort : max
        }, 0) + 1
    }
    return Instruction.create(
      this.db,
      this.pubsub,
      this.id,
      sort,
      action,
      assignments
    )
  }
  deleteInstruction(id) {
    return Instruction.delete(id)
  }
  evaluate() {
    let input = true
    this.instructions.forEach((instruction) => {
      input = instruction.action.evaluate(input)
    })
  }
  get instructions() {
    const instructions = Instruction.instances
      .filter((instruction) => {
        return instruction.branch === this.id
      })
      .sort((a, b) => a.sort - b.sort)
    return instructions
  }
}
Branch.table = `branch`
Branch.instances = []
Branch.fields = [
  { colName: 'rung', colRef: 'rung', onDelete: 'CASCADE' },
  { colName: 'start', colRef: 'instruction', onDelete: 'CASCADE' },
  { colName: 'end', colRef: 'instruction', onDelete: 'CASCADE' },
]

module.exports = {
  Routine,
  Rung,
  Branch,
}
