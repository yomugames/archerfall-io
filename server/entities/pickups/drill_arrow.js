const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class DrillArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.DrillArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.DrillArrow)
    player.reloadAmmo()
  }
}

module.exports = DrillArrow
