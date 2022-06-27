const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class RotatingDart extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.RotatingDart
  }

  apply(player) {
    super.apply(player)
    player.addRotatingDart()
  }
}

module.exports = RotatingDart
