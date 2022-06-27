const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class TimeOrb extends BasePickup {

  constructor(game, data) {
    super(game, data)

    this.pickupSprite.tint = 0x782abf
  }

  getType() {
    return Protocol.definition().PickupType.TimeOrb
  }

  getSpritePath() {
    return "soul.png"
  }

  syncWithServer() {

  }

}

module.exports = TimeOrb