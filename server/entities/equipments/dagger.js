const BaseEquipment = require("./base_equipment")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants")

class Dagger extends BaseEquipment {
  perform() {
    this.detectDaggerCollision()

    this.stage.broadcastEvent("PlayAnimation", {
      id: Protocol.definition().AnimationType.Attack,
      entityId: this.user.getId(),
      isFacingRight: this.user.isFacingRight,
    })
  }

  getType() {
    return Protocol.definition().EquipmentType.Dagger
  }

  getBox() {
    return this.getAttackBox()
  }

  getAttackBox() {
    let box = this.user.getBox()
    box.w = Constants.tileSize * this.getRange()

    if (!this.user.isFacingRight) {
      box.pos.x -= Constants.tileSize * (this.getRange() - 1)
    }

    return box
  }

  detectDaggerCollision() {
    if (this.user.isDead) return

    const entities = this.stage.detectUnitCollisions({
      sourceEntity: this,
      exclude: this.user
    })

    entities.forEach((entity) => {
      entity.die()
    })
  }

  getSpeed() {
    return 0
  }

  getUseRate() {
    return 1
  }

}

module.exports = Dagger