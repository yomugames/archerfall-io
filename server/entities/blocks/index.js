const Protocol = require("../../../common/util/protocol")

const Blocks = {}

Blocks.SpawnPoint = require("./spawn_point")
Blocks.MobSpawner = require("./mob_spawner")

Blocks.Ground = require("./ground")
Blocks.Lava = require("./lava")
Blocks.Boundary = require("./boundary")
Blocks.IceWall = require("./ice_wall")
Blocks.JumpPad = require("./jump_pad")
Blocks.ExplodingOrb = require("./exploding_orb")
Blocks.Wall = require("./wall")
Blocks.TwoWayPlatform = require("./two_way_platform")

Blocks.forType = (type) => {
  const klassName = Protocol.definition().BlockType[type]
  return Blocks[klassName]
}

module.exports = Blocks
