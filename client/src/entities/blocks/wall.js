const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class Wall extends Block {
  constructor(game, data) {
    super(game, data)

    this.setColor(data.color)
  }

  static getBuildOptions() {
    return { color: game.wallColor }
  }

  isWall() {
    return true
  }

  getSpritePath() {
    return "square_white.png"
  }

  getDisplaySpritePath() {
    return "wall.png"
  }

  getType() {
    return Protocol.definition().BlockType.Wall
  }

}

module.exports = Wall