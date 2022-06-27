const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class LaserArrow extends Arrow {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0xEEBE12
  }

  getType() {
    return Protocol.definition().ProjectileType.LaserArrow
  }
}

module.exports = LaserArrow