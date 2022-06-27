const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")

class TwoWayPlatform extends Block {
  constructor(game, data) {
    super(game, data)

    this.setColor(data.color)
    this.sprite.anchor.set(0.5, 1)
  }

  static getBuildOptions() {
    return { color: game.blockColor }
  }

  isGround() {
    return true
  }

  getSpritePath() {
    return "two_way_platform.png"
  }
  
  getType() {
    return Protocol.definition().BlockType.TwoWayPlatform
  }
}

module.exports = TwoWayPlatform
