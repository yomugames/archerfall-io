const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")

class Eraser extends Block {
  constructor(game, data) {
    super(game, data)

    this.getTintableSprite().tint = 0x00ff00
  }

  getSpritePath() {
    return "trash.png"
  }

  getType() {
    return 0
  }

}

module.exports = Eraser
