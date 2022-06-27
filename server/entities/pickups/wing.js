const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class Wing extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Wing
  }

  apply(player) {
    super.apply(player)
    player.addWing()
  }
}

module.exports = Wing