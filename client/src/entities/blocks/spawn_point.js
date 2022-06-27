const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class SpawnPoint extends Block {
  constructor(game, data) {
    super(game, data)
  }

  setColor(color) {
    this.getTintableSprite().tint = ClientHelper.hexToInt(color)
  }

  getSpritePath() {
    return "spawn_point.png"
  }

  getType() {
    return Protocol.definition().BlockType.SpawnPoint
  }

}

module.exports = SpawnPoint