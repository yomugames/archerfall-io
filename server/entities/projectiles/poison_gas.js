const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../common/util/protocol")

const INITIAL_WIDTH = 32
const MAX_WIDTH = 32 * 6
const TOTAL_EXPANSION_TIME = 3 * 1000
const STAY_TIME = 0

class PoisonGas extends BaseProjectile {
  constructor(stage, options) {
    super(stage, options)
    this.expansionTimeStart = new Date().getTime()
    this.expansionTimeEnd = this.expansionTimeStart + TOTAL_EXPANSION_TIME
    this.removeTime = this.expansionTimeEnd + STAY_TIME
    this.width = INITIAL_WIDTH
    this.velocity.x = 0
    this.velocity.y = 0
  }

  onProjectileConstructed() {
    let entities = this.stage.detectUnitCollisions({ sourceEntity: this })
    entities.forEach((entity) => {
      this.onHitEntity(entity)
    })
  }

  getOptions() {
    return {}
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonGas
  }

  onHitPlayer(player) {
    super.onHitPlayer(player)
  }

  setExpansion(progress) {
    this.width = progress * (MAX_WIDTH - INITIAL_WIDTH) + INITIAL_WIDTH
  }

  executeTurn() {
    let entities = this.stage.detectUnitCollisions({ sourceEntity: this })
    entities.forEach((entity) => {
      this.onHitEntity(entity)
    })

    const currentTime = new Date().getTime()

    if (currentTime >= this.removeTime) {
      super.remove()
      return
    }

    if (currentTime >= this.expansionTimeEnd) return

    const expansionTime = currentTime - this.expansionTimeStart
    const expansionProgress = expansionTime / TOTAL_EXPANSION_TIME

    this.setExpansion(expansionProgress)
  }

  applyGravity() {}

  // dont do anything
  detectTileCollisions() {

  }
}

module.exports = PoisonGas
