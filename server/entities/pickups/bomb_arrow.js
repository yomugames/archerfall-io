const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class BombArrow extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.BombArrow
  }

  apply(player) {
    super.apply(player)
    player.setArrowType(Protocol.definition().ProjectileType.BombArrow)
    player.reloadAmmo()
  }
}

module.exports = BombArrow