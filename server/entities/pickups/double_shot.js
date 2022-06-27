const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class DoubleShot extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.DoubleShot
  }

  apply(player) {
    super.apply(player)
    player.addDoubleShot()
  }
}

module.exports = DoubleShot