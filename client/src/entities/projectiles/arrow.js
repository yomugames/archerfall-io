const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../../common/util/protocol")

class Arrow extends BaseProjectile {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0xc38558
  }

  getType() {
    return Protocol.definition().ProjectileType.Arrow
  }

  getSpritePath() {
    return "arrow.png"
  }

}

module.exports = Arrow