const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Explosion = require("./explosion")
const Constants = require("../../../common/constants.json")

class LaserArrow extends Arrow {

  onProjectileConstructed() {
    this.bounceCount = 0
    this.MAX_DURATION = Constants.physicsTimeStep * 6
    this.MAX_BOUNCE_COUNT = 10
    this.insideBlockCount = 0
  }

  getType() {
    return Protocol.definition().ProjectileType.LaserArrow
  }

  getPassableHitDirection() {
    let maxDistance = Constants.tileSize * 3
    let sensorDistance = this.getSpeed()

    let xDiff = Math.cos(this.rotation) * sensorDistance
    let yDiff = Math.sin(this.rotation) * sensorDistance

    // option 1: invert x
    let hits = this.stage.groundMap.raycast(this.getX(), this.getY(), this.getX() - xDiff, this.getY() + yDiff, maxDistance, this)
    if (hits.length === 0) { // empty space
      return { invertX: true }
    }

    // option 2: invert y
    hits = this.stage.groundMap.raycast(this.getX(), this.getY(), this.getX() + xDiff, this.getY() - yDiff, maxDistance, this)
    if (hits.length === 0) { // empty space
      return { invertY: true }
    }

    // option 3: invert x + invert y
    hits = this.stage.groundMap.raycast(this.getX(), this.getY(), this.getX() - xDiff, this.getY() - yDiff, maxDistance, this)
    if (hits.length === 0) { // empty space
      return { invertX: true, invertY: true }
    }

    return {}
  }

  revertPositionToFewFramesBeforeRaycast(raycastHit) {
    let frameDistance = 16
    let xDiff = Math.cos(this.rotation) * frameDistance
    let yDiff = Math.sin(this.rotation) * frameDistance

    this.position.x = raycastHit.x - xDiff
    this.position.y = raycastHit.y - yDiff
  }

  onHitEntity(entity, options = {}) {
    if (entity.isUnit()) {
      super.onHitEntity(entity)
      return
    }

    if (options.raycastHit) {
      this.revertPositionToFewFramesBeforeRaycast(options.raycastHit)

      let direction = this.getPassableHitDirection()
      if (direction.invertX) {
        this.invertXVelocity()
      }

      if (direction.invertY) {
        this.invertYVelocity()
      }

      if (direction.invertX || direction.invertY) {
        entity.onProjectileHit(this)
      }
    }

    this.bounceCount += 1

    if (this.bounceCount >= this.MAX_BOUNCE_COUNT) {
      this.remove()
    }

    let hit = this.stage.groundMap.hitTest(this.getX(), this.getY())
    let isInsideBlock = hit.entity
    if (isInsideBlock) {
      this.insideBlockCount += 1
      if (this.insideBlockCount > 1) {
        this.remove()
      }
    }
  }

  executeTurn() {
    super.executeTurn()

    if (this.durationTimestamp > this.MAX_DURATION) {
      this.remove()
    }
  }

  shouldForceCCDTileCollisionCheck() {
    return true
  }

  applyGravity() {
    // no gravity
  }

  invertXVelocity() {
    this.velocity.x = -this.velocity.x
    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.LaserBounce })
  }

  invertYVelocity() {
    this.velocity.y = -this.velocity.y
    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.LaserBounce })
  }

}

module.exports = LaserArrow
