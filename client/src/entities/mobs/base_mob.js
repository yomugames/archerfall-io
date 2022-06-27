const BaseEntity = require("../base_entity")

class BaseMob extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)

    this.sprite.interactive = false
    this.sprite.filters = this.getFilters()
    this.sprite.name = "Mob"

    this.onMobConstructed()
  }

  onMobConstructed() {

  }

  getFilters() {
    return [this.game.outlineFilter]
  }

  registerEntity() {
    super.registerEntity()

    this.game.addMob(this)
  }

  unregisterEntity() {
    super.unregisterEntity()

    this.game.removeMob(this)
  }

  syncWithServer(data) {
    this.rotation = data.rotation

    this.instructToMove(data.position.x, data.position.y)
    this.instructToRotate(data.rotation)
  }

  getSpriteContainer() {
    return this.game.unitsContainer
  }

  registerAnimationTween(tween) {
    this.tween = tween
    return tween
  }

  cleanupAnimationTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()
    this.cleanupAnimationTween()
  }

}

module.exports = BaseMob