const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const PoisonGas = require("./poison_gas")

class PoisonArrow extends Arrow {
  getType() {
    return Protocol.definition().ProjectileType.PoisonArrow
  }

  onHitEntity(entity) {
    super.onHitEntity(entity)

    PoisonGas.build(this.stage, {
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      rotation: 0,
      shooter: this.shooter,
    })
  }

  getRemoveCountdown() {
    return Constants.physicsTimeStep / 2
  }

  shouldForceCCDTileCollisionCheck() {
    return true
  }
}

module.exports = PoisonArrow
