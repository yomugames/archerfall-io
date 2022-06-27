const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class Shield extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Shield
  }

  apply(player) {
    super.apply(player)
    player.addShield()
  }
}

module.exports = Shield