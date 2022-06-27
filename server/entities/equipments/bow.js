const BaseEquipment = require("./base_equipment")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require("../projectiles/index")

class Bow extends BaseEquipment {

  getType() {
    return Protocol.definition().EquipmentType.Bow
  }

  perform() {
    this.shoot()
  }

  shoot() {
    if (!this.stage) return
    if (this.game.isLevelEditor && !this.stage.shouldEditorSimulate) {
      return
    }

    if (this.user.isDead) return
    if (!this.user.hasAmmo()) return
    this.user.setNormalHeightAndPosition()

    this.user.setCantMove(true)
    this.user.allowMoveAfterTimestamp(1)

    if (this.user.hasEffect("DoubleShot")) {
      this.performShootFrom(this.user.getX(), this.user.getY() + Constants.tileSize / 2)
      this.performShootFrom(this.user.getX(), this.user.getY() - Constants.tileSize / 2)
    } else {
      this.performShootFrom(this.user.getX(), this.user.getY())
    }

    this.stage.broadcastEvent("PlayAnimation", {
      id: Protocol.definition().AnimationType.Attack,
      entityId: this.user.getId(),
      rotation: this.user.targetRotation,
    })

    this.user.reduceAmmo()
    this.user.handleShootFinished()
  }

  performShootFrom(x, y) {
    let sourcePoint = this.game.pointFromDistance(x, y, Constants.tileSize * 1.5, this.user.targetRotation)

    Projectiles.forType(this.user.arrowType).build(this.stage, {
      position: { x: sourcePoint.x, y: sourcePoint.y },
      rotation: this.user.targetRotation,
      shooter: this.user,
    })
  }

  getUseRate() {
    return 3
  }

}

module.exports = Bow