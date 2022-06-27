const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class MobSpawner extends Block {
  constructor(game, data) {
    super(game, data)
  }

  setColor(color) {
    this.getTintableSprite().tint = ClientHelper.hexToInt(color)
  }

  getSpritePath() {
    return "mob_spawner.png"
  }

  getType() {
    return Protocol.definition().BlockType.MobSpawner
  }
}

module.exports = MobSpawner
