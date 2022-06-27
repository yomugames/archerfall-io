const BasePickup = require("./base_pickup")
const Protocol = require("../../../../common/util/protocol")

class BombArrow extends BasePickup {

  constructor(game, data) {
    super(game, data)
    
    this.sprite.rotation = -45 * Math.PI / 180
  }

  getType() {
    return Protocol.definition().PickupType.BombArrow
  }

  getSpritePath() {
    return "bomb_arrow.png"
  }

  syncWithServer() {

  }

}

module.exports = BombArrow