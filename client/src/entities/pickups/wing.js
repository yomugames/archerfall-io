const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class Wing extends BasePickup {

  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.Wing
  }

  getSpritePath() {
    return "wing_pickup.png"
  }

  syncWithServer() {

  }

}

module.exports = Wing