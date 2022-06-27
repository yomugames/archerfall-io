const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class LaserArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.LaserArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.LaserArrow)
    player.reloadAmmo()
  }
}

module.exports = LaserArrow