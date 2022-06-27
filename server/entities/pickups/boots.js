const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class Boots extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Boots
  }

  apply(player) {
    super.apply(player)
    player.addHaste()
  }
}

module.exports = Boots