const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class ExplodingOrb extends BaseProjectile {

  getType() {
    return Protocol.definition().ProjectileType.ExplodingOrb
  }

  getRemoveCountdown() {
    return 1
  }

  onHitEntity(obstacle, options) {
    super.onHitEntity(obstacle, options)

    let openTiles = this.stage.floodFill({
      row: this.getRow() + 1, // one row higher to account for raycastHit point
      col: this.getCol(),
      maxDistance: 3,
      shouldStop: (hit) => {
        return hit.entity // presence of block
      }
    })

    let explosions = openTiles.map((hit) => {
      let timestamp = hit.distance < 3 ? this.game.timestamp : this.game.timestamp + hit.distance - 2
      return {
        row: hit.row,
        col: hit.col,
        shooter: this.shooter,
        type: Protocol.definition().ProjectileType.ChemicalExplosion,
        timestamp: timestamp
      }
    })

    this.stage.queueExplosions(explosions)
    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.ChemicalExplosion })
  }

  applyGravity(gravity) {
    if (this.hasHitObject) return

    this.velocity.add(gravity)
  }

}

module.exports = ExplodingOrb
