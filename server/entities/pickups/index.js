const Pickups = {}
Pickups.Soul = require("./soul")

Pickups.TimeOrb = require("./time_orb")
Pickups.Shield = require("./shield")
Pickups.Wing = require("./wing")
Pickups.Boots = require("./boots")
Pickups.DoubleShot = require("./double_shot")
Pickups.Invisibility = require("./invisibility")
Pickups.RotatingDart = require("./rotating_dart")
Pickups.Dagger = require("./dagger")

Pickups.BombArrow = require("./bomb_arrow")
Pickups.LaserArrow = require("./laser_arrow")
Pickups.IceArrow = require("./ice_arrow")
Pickups.BoltArrow = require("./bolt_arrow")
Pickups.DrillArrow = require("./drill_arrow")
Pickups.PoisonArrow = require("./poison_arrow")

Pickups.getList = () => {
  return Object.values(Pickups).filter((klass) => {
    if (!klass.prototype) return false
    if (klass.name === "Soul") return false
    return true
  })
}

Pickups.getArrows = () => {
  return Object.values(Pickups).filter((klass) => {
    if (!klass.prototype) return false
    if (klass.name.indexOf("Arrow") === -1) return false
    return true
  })
}

Pickups.getPowerups = () => {
  return Object.values(Pickups).filter((klass) => {
    if (!klass.prototype) return false
    if (klass.name === "Soul") return false
    return klass.name.indexOf("Arrow") === -1
  })
}

Pickups.getMeleeWeapons = () => {
  return Object.values(Pickups).filter((klass) => {
    if (!klass.prototype) return false
    return klass.prototype.isMeleeWeapon()
  })
}

module.exports = Pickups
