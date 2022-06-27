const Protocol = require("../../../../common/util/protocol")

const Animations = {}

Animations.MobPortal = require("./mob_portal")

Animations.forType = (type) => {
  const klass = Protocol.definition().ClientAnimationType[type]
  return Animations[klass]
}

module.exports = Animations
