const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class IceArrow extends Arrow {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0x4fd7f8
  }

  getType() {
    return Protocol.definition().ProjectileType.IceArrow
  }
}

module.exports = IceArrow