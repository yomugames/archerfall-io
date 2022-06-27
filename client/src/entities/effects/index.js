const Protocol = require("../../../../common/util/protocol")
const Effects = {}

Effects.Shield = require("./shield")
Effects.Invisible = require("./invisible")
Effects.Wing = require("./wing")
Effects.Haste = require("./haste")
Effects.DoubleShot = require("./double_shot")
Effects.Ghost = require("./ghost")
Effects.Fire = require("./fire")
Effects.RotatingDart = require("./rotating_dart")

Effects.forType = (type) => {
  const klassName = Protocol.definition().EffectType[type]
  return Effects[klassName]
}

module.exports = Effects
