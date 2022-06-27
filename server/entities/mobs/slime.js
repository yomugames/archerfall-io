const BaseMob = require("./base_mob");
const Protocol = require("../../../common/util/protocol")

class Slime extends BaseMob {
  onMobConstructed() {
    this.isFacingRight = Math.random() < 0.5 
  }

  getType() {
    return Protocol.definition().MobType.Slime
  }

  executeTurn() {
    super.executeTurn()

    if (this.isFacingRight) {
      this.setLinearVelocity(this.getSpeed(), 0)
    } else {
      this.setLinearVelocity(-this.getSpeed(), 0)
    }
  }

  onHitEntity(obstacle, options = {}) {
    if (options.direction === 'horizontal') {
      this.isFacingRight = !this.isFacingRight
    }
  }
}

module.exports = Slime