const Protocol = require("../../../../common/util/protocol")
const Pickups = {}

// Pickups.Soul = require("./soul")
Pickups.TimeOrb = require("./time_orb")

Pickups.Shield = require("./shield")
Pickups.Wing = require("./wing")
Pickups.Invisibility = require("./invisibility")
Pickups.Boots = require("./boots")
Pickups.DoubleShot = require("./double_shot")
Pickups.RotatingDart = require("./rotating_dart")

Pickups.Dagger = require("./dagger")
Pickups.BombArrow = require("./bomb_arrow")
Pickups.LaserArrow = require("./laser_arrow")
Pickups.IceArrow = require("./ice_arrow")
Pickups.BoltArrow = require("./bolt_arrow")
Pickups.PoisonArrow = require("./poison_arrow")

Pickups.DrillArrow = require("./drill_arrow")

Pickups.forType = (type) => {
  const klassName = Protocol.definition().PickupType[type]
  return Pickups[klassName]
}

Pickups.getList = () => {
  return Object.values(Pickups).filter((klass) => {
    return klass.prototype
  })
}

module.exports = Pickups
