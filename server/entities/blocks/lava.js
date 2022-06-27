const PassableBlock = require("./passable_block")
const Protocol = require("../../../common/util/protocol")

class Lava extends PassableBlock {

  constructor(stage, options) {
    super(stage, options)
  }

  getType() {
    return Protocol.definition().BlockType.Lava
  }

  isLava() {
    return true
  }

}

module.exports = Lava