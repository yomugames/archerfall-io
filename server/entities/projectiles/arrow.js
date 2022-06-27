const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../common/util/protocol")

class Arrow extends BaseProjectile {
  getType() {
    return Protocol.definition().ProjectileType.Arrow
  }

  onHitPlayer(player) {
    super.onHitPlayer(player)

    this.position.x = player.getX()
    this.position.y = player.getY()

    this.setParent(player)

    // this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.ArrowHit })
  }

  isArrow() {
    return true
  }
}

module.exports = Arrow
