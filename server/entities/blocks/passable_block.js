const Block = require("./block")

class PassableBlock extends Block {

  shouldObstruct(obstacle) {
    return false
  }

}

module.exports = PassableBlock