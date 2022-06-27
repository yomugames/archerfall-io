const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class Dagger extends BasePickup {
  constructor(game, data) {
    super(game, data)
  }

  getType() {
    return Protocol.definition().PickupType.Dagger
  }

  getSpritePath() {
    return "dagger.png"
  }

  syncWithServer() {}
}

module.exports = Dagger