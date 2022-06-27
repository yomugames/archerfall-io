const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class PoisonArrow extends Arrow {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0x00ff00
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonArrow
  }
}

module.exports = PoisonArrow