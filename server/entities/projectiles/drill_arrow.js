const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

const MINIMUM_SPEED = 4
const DURATION_STEPS = 6
const SLOW_VELOCITY_FACTOR = 0.5

class DrillArrow extends Arrow {
  constructor(stage, options) {
    super(stage, options)
  }

  static getSlowingDownBlocks() {
    const blockTypes = Protocol.definition().BlockType
    return [blockTypes.Ground]
  }

  onProjectileConstructed() {
    this.MAX_DURATION = Constants.physicsTimeStep * DURATION_STEPS
  }

  getType() {
    return Protocol.definition().ProjectileType.DrillArrow
  }

  onNoHit() {
    if (this.origVelocity) {
      this.velocity = this.origVelocity
      this.isSlowed = false
    }
  }

  onHitEntity(entity, options = {}) {
    if (entity.isUnit()) {
      super.onHitEntity(entity)
      return
    }

    entity.onProjectileHit(this)

    const isSlowingObstacle = DrillArrow.getSlowingDownBlocks().includes(entity.getType())
    if (!isSlowingObstacle) return

    if (this.isSlowed) return

    this.origVelocity = this.velocity.clone()
    this.velocity.scale(SLOW_VELOCITY_FACTOR)
    this.isSlowed = true
  }

  executeTurn() {
    super.executeTurn()

    if (this.durationTimestamp > this.MAX_DURATION) {
      this.remove()
    }
  }

  shouldForceCCDTileCollisionCheck() {
    return false
  }

  applyGravity() {
    // no gravity
  }
}

module.exports = DrillArrow
