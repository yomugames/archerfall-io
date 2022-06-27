const Arrow = require("./arrow")
const Protocol = require("../../../../common/util/protocol")

class DrillArrow extends Arrow {
  onProjectileConstructed() {
    this.game.soundManager.playSound("drill")
  }

  getSpritePath() {
    return "drill_arrow.png"
  }

  getType() {
    return Protocol.definition().ProjectileType.DrillArrow
  }
}

module.exports = DrillArrow
