const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")

class Ground extends Block {
  constructor(game, data) {
    super(game, data)

    this.setColor(data.color)
  }

  static getBuildOptions() {
    return { color: game.blockColor }
  }

  isGround() {
    return true
  }

  getSpritePath() {
    return "square_white.png"
  }

  getType() {
    return Protocol.definition().BlockType.Ground
  }

}

module.exports = Ground