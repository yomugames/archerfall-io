const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Explosion = require("./explosion")
const Constants = require("../../../common/constants.json")

class BombArrow extends Arrow {

  getType() {
    return Protocol.definition().ProjectileType.BombArrow
  }

  remove() {
    super.remove()

    Explosion.build(this.stage, {
       position: { x: this.getX(), y: this.getY() },
       rotation: 0,
       shooter: this.shooter
    })
  }
  
  getRemoveCountdown() {
    return Constants.physicsTimeStep / 2
  }


}

module.exports = BombArrow