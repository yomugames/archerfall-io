const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class Boots extends BasePickup {

  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.Boots
  }

  getSpritePath() {
    return "boots.png"
  }

  syncWithServer() {

  }

}

module.exports = Boots