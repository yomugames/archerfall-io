const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class BoltArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.BoltArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.BoltArrow)
    player.reloadAmmo()
  }
}

module.exports = BoltArrow