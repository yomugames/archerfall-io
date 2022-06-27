const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class IceArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.IceArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.IceArrow)
    player.reloadAmmo()
  }
}

module.exports = IceArrow