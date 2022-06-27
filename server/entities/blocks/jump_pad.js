const Block = require("./block")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class JumpPad extends Block {

  constructor(stage, options) {
    super(stage, options)
  }

  getType() {
    return Protocol.definition().BlockType.JumpPad
  }

  getDefaultWidth() {
    return Constants.tileSize * 2
  }

  isJumpPad() {
    return true
  }

}

module.exports = JumpPad