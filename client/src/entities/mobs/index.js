const Protocol = require("../../../../common/util/protocol")

const Mobs = {}
Mobs.Slime = require("./slime")


Mobs.forType = (type) => {
  const klassName = Protocol.definition().MobType[type]
  return Mobs[klassName]
}

module.exports = Mobs