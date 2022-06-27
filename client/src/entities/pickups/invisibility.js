const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class Invisibility extends BasePickup {

  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.Invisibility
  }

  getSpritePath() {
    return "invisibility.png"
  }

  syncWithServer() {

  }

}

module.exports = Invisibility