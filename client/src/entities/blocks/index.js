const Protocol = require("../../../../common/util/protocol")
const Blocks = {}

Blocks.Eraser = require("./eraser")
Blocks.SpawnPoint = require("./spawn_point")
Blocks.MobSpawner = require("./mob_spawner")

Blocks.Ground = require("./ground")
Blocks.TwoWayPlatform = require("./two_way_platform")
Blocks.Wall = require("./wall")
Blocks.Lava = require("./lava")
Blocks.IceWall = require("./ice_wall")
Blocks.Boundary = require("./boundary")
Blocks.JumpPad = require("./jump_pad")
Blocks.ExplodingOrb = require("./exploding_orb")

Blocks.forType = (type) => {
  const klassName = Protocol.definition().BlockType[type]
  return Blocks[klassName]
}

Blocks.getList = () => {
  let excludeList = ["Boundary", "IceWall"]
  return Object.values(Blocks).filter((klass) => {
    if (!klass.prototype) return false

    let shouldExclude = excludeList.indexOf(klass.prototype.getTypeName()) !== -1
    if (shouldExclude) return false

    return true
  })
}

module.exports = Blocks
