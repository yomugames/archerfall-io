const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class Invisibility extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Invisibility
  }

  apply(player) {
    super.apply(player)
    player.addInvisible()
  }
}

module.exports = Invisibility