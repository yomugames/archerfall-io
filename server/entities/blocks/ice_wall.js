const Block = require("./block")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class IceWall extends Block {

  constructor(stage, options) {
    super(stage, options)

    this.removeTimestamp = this.game.timestamp + Constants.physicsTimeStep * 3
  }

  getType() {
    return Protocol.definition().BlockType.IceWall
  }

  isProcessor() {
    return true
  }

  executeTurn() {
    if (this.game.timestamp >= this.removeTimestamp) {
      this.remove()
      return
    }
  }

}

module.exports = IceWall