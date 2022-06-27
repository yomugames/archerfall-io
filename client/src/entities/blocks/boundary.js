const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")

class Boundary extends Block {
  constructor(game, data) {
    super(game, data)

    this.getTintableSprite().tint = 0xff0000
    this.getTintableSprite().alpha = 0.5
  }

  getSpritePath() {
    return "square_white.png"
  }

  getSpriteContainer() {
    return this.game.effectsContainer
  }

  getType() {
    return Protocol.definition().BlockType.Boundary
  }

  isMovingObject() {
    return true
  }

}

module.exports = Boundary