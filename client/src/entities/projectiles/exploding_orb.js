const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../../common/util/protocol")

class ExplodingOrb extends BaseProjectile {

  onProjectileConstructed() {
  }

  getType() {
    return Protocol.definition().ProjectileType.ExplodingOrb
  }

  getSpritePath() {
    return "exploding_orb.png"
  }

}

module.exports = ExplodingOrb