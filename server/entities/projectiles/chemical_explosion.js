const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class ChemicalExplosion extends BaseProjectile {

  onProjectileConstructed() {
    let entities = this.stage.detectUnitCollisions({ sourceEntity: this })
    entities.forEach((entity) => {
      this.onHitEntity(entity)
    })

    this.hasHitObject = true
    this.removeCountdown = 2
  }

  getOptions() {
    return {}
  }

  damageUnits() {
  }

  getType() {
    return Protocol.definition().ProjectileType.ChemicalExplosion
  }

  onHitPlayer(player) {
    super.onHitPlayer(player)
  }

  applyGravity() {

  }

  // dont do anything
  detectTileCollisions() {

  }

}

module.exports = ChemicalExplosion