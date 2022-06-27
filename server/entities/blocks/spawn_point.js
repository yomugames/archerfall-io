const PassableBlock = require("./passable_block")
const Protocol = require("../../../common/util/protocol")

class SpawnPoint extends PassableBlock {

  getType() {
    return Protocol.definition().BlockType.SpawnPoint
  }

  isSpawnPoint() {
    return true
  }

  register() {
    super.register()
    this.stage.addSpawnPoint(this)
  }

  unregister() {
    super.unregister()
    this.stage.removeSpawnPoint(this)
  }

  
}

module.exports = SpawnPoint