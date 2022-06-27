const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")
const Constants = require("../../../../common/constants.json")

class RotatingDart extends BasePickup {
  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.RotatingDart
  }

  getSpritePath() {
    return "shuriken.png"
  }

  syncWithServer() {}

  getRenderSize() {
    return Constants.tileSize
  }
}

module.exports = RotatingDart
