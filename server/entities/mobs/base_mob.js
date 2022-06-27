const BaseEntity = require("../base_entity");
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class BaseMob extends BaseEntity {
  static build(stage, data) {
    return new this(stage, data)
  }

  constructor(stage, options = {}) {
    super(stage, options)

    this.type = this.getType()
    this.onMobConstructed()
  }

  onMobConstructed() {

  }

  executeTurn() {
    const players = this.stage.detectPlayerCollisions({ sourceEntity: this })
    players.forEach((player) => {
      player.onMobHit(this)
    })
  }

  register() {
    super.register()
    this.stage.addMob(this)
  }

  unregister() {
    super.unregister()
    this.stage.removeMob(this)
  }

  getTypeName() {
    return Protocol.definition().MobType[this.type]
  }

  getConstants(type = this.type) {
    let klassName = Protocol.definition().MobType[type]
    return Constants.Mobs[klassName]
  }

  getDefaultWidth() {
    return this.getConstants(this.getType()).width
  }

  getDefaultHeight(data) {
    return this.getConstants(this.getType()).height
  }

  getSpeed() {
    return this.getConstants().speed
  }

  onProjectileHit(projectile) {
    this.die(projectile.shooter)
  }

  die() {
    this.remove()

    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.MonsterHit })
  }

  isUnit() {
    return true
  }
}

module.exports = BaseMob