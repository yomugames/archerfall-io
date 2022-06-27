const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")
const Constants = require("../../../../common/constants.json")

class DoubleShot extends BasePickup {

  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.DoubleShot
  }

  getSpritePath() {
    return "double_shot.png"
  }

  syncWithServer() {

  }

  getRenderSize() {
    return Constants.tileSize
  }

}

module.exports = DoubleShot