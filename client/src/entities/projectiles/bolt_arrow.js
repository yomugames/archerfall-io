const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class BoltArrow extends Arrow {

  onProjectileConstructed() {
    this.game.soundManager.playSound("arrow")
    this.sprite.tint = 0x8A3DC7
  }

  getType() {
    return Protocol.definition().ProjectileType.BoltArrow
  }
}

module.exports = BoltArrow