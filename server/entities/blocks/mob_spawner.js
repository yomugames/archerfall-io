const PassableBlock = require("./passable_block")
const Protocol = require("../../../common/util/protocol")

class MobSpawner extends PassableBlock {
  constructor(stage, data) {
    super(stage, data)

    this.isSpawning = false
  }

  getType() {
    return Protocol.definition().BlockType.MobSpawner
  }

  isMobSpawner() {
    return true
  }

  register() {
    super.register()
    this.stage.addMobSpawner(this)
  }

  unregister() {
    super.unregister()
    this.stage.removeMobSpawner(this)
  }
}

module.exports = MobSpawner
