const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class ExplodingOrb extends Block {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "exploding_orb.png"
  }

  getType() {
    return Protocol.definition().BlockType.ExplodingOrb
  }

  isMovingObject() {
    return true
  }

}

module.exports = ExplodingOrb