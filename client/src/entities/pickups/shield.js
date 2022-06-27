const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")
const Constants = require("../../../../common/constants.json")

class Shield extends BasePickup {

  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.Shield
  }

  getSpritePath() {
    return "shield_pickup.png"
  }

  syncWithServer() {

  }

  getRenderSize() {
    return Constants.tileSize
  }

}

module.exports = Shield