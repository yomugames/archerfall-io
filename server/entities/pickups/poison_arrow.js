const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class PoisonArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.PoisonArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.PoisonArrow)
    player.reloadAmmo()
  }
}

module.exports = PoisonArrow