const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class DrillArrow extends BasePickup {
  constructor(game, data) {
    super(game, data)

    this.sprite.rotation = (-45 * Math.PI) / 180
  }

  getType() {
    return Protocol.definition().PickupType.DrillArrow
  }

  getSpritePath() {
    return "drill_arrow.png"
  }

  syncWithServer() {}
}

module.exports = DrillArrow
