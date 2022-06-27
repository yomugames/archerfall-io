const BaseEntity = require("../base_entity")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BaseProjectile extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)

    this.rotation = data.rotation
    this.sprite.rotation = data.rotation
    this.sprite.interactive = false
    this.sprite.filters = this.getFilters()

    this.onProjectileConstructed()
  }

  getFilters() {
    return [this.game.outlineFilter]
  }

  onProjectileConstructed() {}

  syncWithServer(data) {
    this.rotation = data.rotation

    this.instructToMove(data.position.x, data.position.y)
    this.instructToRotate(data.rotation)
  }

  registerEntity() {
    super.registerEntity()

    this.game.addProjectile(this)
  }

  unregisterEntity() {
    super.unregisterEntity()

    this.game.removeProjectile(this)
  }

  getDefaultWidth(data) {
    return this.getConstants(data.type).width
  }

  getDefaultHeight(data) {
    return this.getConstants(data.type).height
  }

  getConstants(type) {
    let klassName = Protocol.definition().ProjectileType[type]
    return Constants.Projectiles[klassName]
  }
}

module.exports = BaseProjectile
