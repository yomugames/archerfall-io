const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class Soul extends BasePickup {

  constructor(game, data) {
    super(game, data)

    this.sprite.tint = 0xff0000
  }

  getType() {
    return Protocol.definition().PickupType.Soul
  }

  getSpritePath() {
    return "soul.png"
  }

  syncWithServer() {

  }

}

module.exports = Soul