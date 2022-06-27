const Protocol = require("../../../common/util/protocol")

const Projectiles = {}

Projectiles.Arrow = require("./arrow")
Projectiles.Explosion = require("./explosion")
Projectiles.BombArrow = require("./bomb_arrow")
Projectiles.LaserArrow = require("./laser_arrow")
Projectiles.IceArrow = require("./ice_arrow")
Projectiles.BoltArrow = require("./bolt_arrow")
Projectiles.PoisonArrow = require("./poison_arrow")
Projectiles.Bolt = require("./bolt")
Projectiles.PoisonGas = require("./poison_gas")
Projectiles.ExplodingOrb = require("./exploding_orb")
Projectiles.ChemicalExplosion = require("./chemical_explosion")
Projectiles.DrillArrow = require("./drill_arrow")

Projectiles.forType = (type) => {
  const klassName = Protocol.definition().ProjectileType[type]
  return Projectiles[klassName]
}

Projectiles.getList = () => {
  return Object.values(Projectiles).filter((klass) => {
    return klass.prototype
  })
}

module.exports = Projectiles
