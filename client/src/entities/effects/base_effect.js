class BaseEffect {
  static build(entity) {
    return new this(entity)
  }

  constructor(entity) {
    this.affectedEntity = entity

    this.apply()
  }

  apply() {

  }

  remove() {

  }

  isWing() {
    return false
  }
}

module.exports = BaseEffect