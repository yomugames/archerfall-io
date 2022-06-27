const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class IceWall extends Block {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "ice_cube.png"
  }

  getType() {
    return Protocol.definition().BlockType.IceWall
  }

}

module.exports = IceWall