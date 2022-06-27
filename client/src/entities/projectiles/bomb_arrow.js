const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class BombArrow extends Arrow {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0xff0000
  }

  getType() {
    return Protocol.definition().ProjectileType.BombArrow
  }
}

module.exports = BombArrow