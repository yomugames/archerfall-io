const BaseEntity = require("../base_entity")
const Constants = require("../../../common/constants.json")
const Protocol = require("../../../common/util/protocol")
const SAT = require("sat")

class BaseProjectile extends BaseEntity {
  static build(stage, data) {
    data.type = this.prototype.getType()
    return new this(stage, data)
  }

  constructor(stage, options = {}) {
    super(stage, options)

    this.type = this.getType()

    this.shooter = options.shooter
    this.rotation = options.rotation
    this.position.x = options.position.x
    this.position.y = options.position.y

    this.lastPosition = { x: this.position.x, y: this.position.y }

    this.velocity.x = this.getSpeed() * Math.cos(this.rotation)
    this.velocity.y = this.getSpeed() * Math.sin(this.rotation)

    this.stage.onProjectileUpdated(this)
    this.durationTimestamp = 0

    this.MAX_DURATION = Constants.physicsTimeStep * 6

    this.onProjectileConstructed()
  }

  onProjectileConstructed() {}

  getTypeName() {
    return Protocol.definition().ProjectileType[this.type]
  }

  getRotation() {
    return this.rotation
  }

  getDefaultWidth(data) {
    return this.getConstants(data.type).width
  }

  // bodies already moved
  executeTurn() {
    this.durationTimestamp += 1

    if (this.durationTimestamp > this.MAX_DURATION) {
      this.remove()
    }

    if (this.hasHitObject) {
      this.removeCountdown -= 1
      if (this.removeCountdown <= 0) {
        this.remove()
      }

      return
    }

    this.rotation = Math.atan2(this.velocity.y, this.velocity.x)

    if (this.skipCollisionCheckOnce) {
      this.skipCollisionCheckOnce = false
      return
    }

    let options = this.getCollisionOptions()
    const entities = this.stage.detectUnitCollisions(options)
    entities.forEach((entity) => {
      this.onHitEntity(entity)
    })

    this.detectTileCollisions(this.stage.groundMap)
  }

  teleportMainBodyToCenter() {
    super.teleportMainBodyToCenter()
  }

  limitHorizontalMovement() {}

  limitVerticalMovement() {}

  shouldForceCCDTileCollisionCheck() {
    return false
  }

  detectTileCollisions(grid) {
    // ccd test
    let maxDistance = Constants.tileSize * 4
    let hits = grid.raycast(this.lastPosition.x, this.lastPosition.y, this.getX(), this.getY(), maxDistance, this)
    if (hits.length > 0) {
      this.debugRaycast(hits)
      this.onCCDHitTile(hits[0])
    } else {
      this.onNoHit()
    }
  }

  debugRaycast(hits) {
    if (false) {
      this.stage.broadcastEvent("Debug", {
        mode: "raycast",
        points: [{ x: hits[0].x, y: hits[0].y }],
      })
    }
  }

  onHitTile(entity) {
    this.onHitEntity(entity)
  }

  onCCDHitTile(raycastHit) {
    this.onHitEntity(raycastHit.entity, { raycastHit: raycastHit })
  }

  onNoHit() {}

  getCollisionOptions() {
    let options = { sourceEntity: this }

    if (this.durationTimestamp < 4) {
      options["exclude"] = this.shooter
    }

    return options
  }

  getMaxFallSpeed() {
    return -90
  }

  getDistanceFromLastPosition() {
    let lineDelta = {
      x: this.getX() - this.lastPosition.x,
      y: this.getY() - this.lastPosition.y,
    }

    let distance = Math.sqrt(lineDelta.x ** 2 + lineDelta.y ** 2)
    return distance
  }

  getCCDLinePolygon() {
    let bottomLeftPos = new SAT.Vector(
      this.lastPosition.x, 
      this.lastPosition.y
    )

    let angle = Math.atan2(
      this.getY() - this.lastPosition.y,
      this.getX() - this.lastPosition.x
    )

    let width =  this.getDistanceFromLastPosition()
    let height = this.height

    const polygon = new SAT.Polygon(bottomLeftPos, [
      new SAT.Vector(0, 0),
      new SAT.Vector(width, 0),
      new SAT.Vector(width, height),
      new SAT.Vector(0, height),
    ])

    polygon.setAngle(angle)

    return polygon
  }

  applyGravity(gravity) {
    if (this.hasHitObject) return
    if (this.durationTimestamp < 3) return

    super.applyGravity(gravity)
  }

  applyFriction() {}

  getDefaultHeight(data) {
    return this.getConstants(data.type).height
  }

  getConstants(type = this.type) {
    let klassName = Protocol.definition().ProjectileType[type]
    return Constants.Projectiles[klassName]
  }

  getSpeed() {
    return this.getConstants().speed
  }

  register() {
    super.register()
    this.stage.addProjectile(this)
  }

  unregister() {
    super.unregister()
    this.stage.removeProjectile(this)
  }

  onHitEntity(obstacle, options = {}) {
    obstacle.onProjectileHit(this)

    this.markHitObjectAndRemove(obstacle, options)
  }

  markHitObjectAndRemove(obstacle, options) {
    this.velocity.x = 0
    this.velocity.y = 0

    this.hasHitObject = true

    this.removeCountdown = obstacle.isUnit() ? 0 : this.getRemoveCountdown()

    if (options.raycastHit) {
      this.position.x = options.raycastHit.x
      this.position.y = options.raycastHit.y
    }
  }

  getRemoveCountdown() {
    return Constants.physicsTimeStep
  }

  remove() {
    super.remove()
    this.stage.onProjectileUpdated(this)
  }

}

module.exports = BaseProjectile
