const Faker = require("faker")
const Protocol = require("../../common/util/protocol")
const { distance, subtract, codirectionality, centroid, normalized } = require("../util/VectorMath")
const Player = require("./player")

const RANGE = 256

class PlayerBot extends Player {
  constructor(data) {
    super(null, data)

    this.name = this.generateName()
    this.username = this.name
    this.assignColor(this.game.useRandomColor())
    this.assignHat(this.game.getRandomHat())

    // we put it here so that we already have color/hat metadata
    // when broadcasting to client
    this.stage.addPlayer(this)
  }

  generateName() {
    return `${Faker.name.firstName()} Bot`
  }

  unregister() {
    super.unregister()
    this.stage.removePlayer(this)
  }

  isBot() {
    return true
  }

  getTile(tile) {
    return this.stage.groundMap.get(tile.row, tile.col)
  }

  getTilesInFront(predicate, range) {
    if (!predicate || typeof predicate !== "function") return

    const bodyTiles = [this.getUpperBodyRowCol(), this.getLowerBodyRowCol()]
    const next = this.isFacingRight ? range : -range
    const nextTiles = bodyTiles.map((t) => this.getTile({ ...t, col: t.col + next }))

    return nextTiles.filter((t) => predicate(t))
  }

  getTilesUnder(predicate, range) {
    if (!predicate || typeof predicate !== "function") return

    const lowerBody = this.getLowerBodyRowCol()
    const tilesUnder = new Array(range)
      .fill(lowerBody)
      .map((body, index) => this.getTile({ ...body, row: body.row - index + 1 }))

    return tilesUnder.filter((t) => predicate(t))
  }

  isBlocked() {
    return this.getTilesInFront((tile) => tile && tile.shouldObstruct(), 1).length
  }

  avoidLava() {
    const isLava = (tile) => tile && tile.getType() === Protocol.definition().BlockType.Lava
    const walkingInLava = this.getTilesInFront(isLava, 1).length
    const fallingInLava = this.getTilesUnder(isLava, 3).length

    if (fallingInLava) {
      this.jump()
      return true
    }

    if (walkingInLava) {
      this.isFacingRight = !this.isFacingRight
      return true
    }

    return false
  }

  avoidMob() {
    let mobs = this.stage.getMobList()

    const riskBox = this.getBox()
    const anticipationSize = 32
    const anticipation = this.isFacingRight ? anticipationSize : -anticipationSize
    riskBox.pos.x += anticipation

    const hasCollidingMob = mobs.find((mob) => {
      return this.stage.isAABBIntersect(riskBox, mob.getBox())
    })

    if (hasCollidingMob) {
      this.jump()
      return true
    }

    return false
  }


  moveInFacingDirection() {
    if (this.isBlocked()) {
      if (this.canJump()) {
        this.jump()
      } else {
        this.isFacingRight = !this.isFacingRight
      }
    }
    this.isFacingRight ? this.moveForward(this.getSpeed()) : this.moveBackward(this.getSpeed())
  }

  hasPickupWeapon() {
    return this.equip !== Protocol.definition().ProjectileType.Arrow
  }

  getClosestPickup() {
    const pickups = this.stage.getPickups()
    if (pickups.length === 0) return null

    let min = { dist: Number.POSITIVE_INFINITY, pickup: null }
    for (const pickup of pickups) {
      const dist = distance(this.position, pickup.position)
      min = dist < min.dist ? { dist, pickup } : min
    }

    return min.pickup
  }

  getPlayerInRange() {
    const players = this.stage.getPlayerList()

    let min = { dist: Number.POSITIVE_INFINITY, player: null }
    for (const player of players) {
      if (player === this) continue
      const dist = distance(this.position, player.position)
      if (dist > RANGE) continue
      min = dist < min.dist ? { dist, player: player } : min
    }

    return min.player
  }

  moveToClosestPickup() {
    const pickup = this.getClosestPickup()
    if (!pickup) return

    const acceptableRange = 64
    const yDelta = this.position.y - pickup.position.y
    const yDist = Math.abs(yDelta)
    const pickupIsAbove = yDelta < 0 && yDist > acceptableRange
    const pickupIsBelow = yDelta > 0 && yDist > acceptableRange
    if (pickupIsAbove) {
      this.jump()
    } else if (pickupIsBelow) {
    } else {
      this.isFacingRight = pickup.position.x > this.position.x
    }
    this.moveInFacingDirection()
  }

  getThreatProjectiles() {
    const projectiles = this.stage.getProjectiles()
    if (!projectiles.length) return []

    let threats = []
    for (const projectile of projectiles) {
      const dist = distance(this.position, projectile.position)
      const codir = codirectionality(subtract(this.position, projectile.position), projectile.velocity)
      const isInRange = dist <= 200
      const isIncoming = codir > 0.5

      if (isInRange && isIncoming) {
        threats.push(projectile)
      }
    }

    return threats
  }

  isEndangeredByBoundary() {
    const boundaries = this.stage.getBoundaries()
    if (!boundaries.length) return false

    const playerBox = this.getBox()
    const anticipationSize = 32
    const anticipation = this.isFacingRight ? anticipationSize : -anticipationSize
    const riskBox = { ...playerBox, pos: { ...playerBox.pos, x: playerBox.pos.x + anticipation } }
    const riskBoundary = this.isFacingRight ? boundaries[1] : boundaries[0]

    if (this.stage.isAABBIntersect(riskBox, riskBoundary.getBox())) {
      return true
    }

    return false
  }

  avoidBoundary() {
    if (this.isEndangeredByBoundary()) {
      this.isFacingRight = !this.isFacingRight
      this.moveInFacingDirection()
      return true
    }

    return false
  }

  assessAndReactToThreats() {
    if (this.avoidLava()) return true
    if (this.avoidMob()) return true
    if (this.avoidBoundary()) return true

    const projectiles = this.getThreatProjectiles()
    if (!projectiles.length) return false

    if (this.shouldDodgeProjectiles()) {
      const avgPos = centroid(...projectiles.map((p) => p.position))
      const avgDir = centroid(...projectiles.map((p) => p.velocity))

      this.dodgeProjectiles({ position: avgPos, velocity: avgDir })
      return true
    }

    return false
  }

  shouldDodgeProjectiles() {
    return Math.random() < 0.5
  }

  dodgeProjectiles({ position, velocity }) {
    const delta = subtract(position, this.position)
    const dir = normalized(velocity)

    if (this.canJump() && this.canRoll()) {
      // coming from side
      if (Math.abs(delta.y) < 64) {
        //console.log("horizontal", delta)
        if (Math.abs(delta.x) < 100) {
          this.roll()
        } else {
          this.jump()
        }
        // coming from top
      } else if (delta.y > 0) {
        //console.log("from top", delta)
        this.roll()
        // coming from bottom
      } else {
        //console.log("from bottom", delta)
        this.jump()
      }

      return
    }

    if (this.canJump() && delta.y < 0) {
      //console.log("can only jump", delta)
      this.jump()
      return
    }

    if (this.canRoll()) {
      //console.log("can only roll", delta)
      this.roll()
      return
    }

    // can only move
    //console.log("can only move", delta)
    if (this.isFacingRight && delta.x > 0) {
      // coming right, move left
      this.isFacingRight = false
      this.moveInFacingDirection()
    } else if (!this.isFacingRight && delta.x < 0) {
      // coming left, move right
      this.isFacingRight = true
      this.moveInFacingDirection()
    }
  }

  assessAndFollowGoal() {
    if (!this.hasPickupWeapon() && this.stage.getPickupCount()) {
      this.moveToClosestPickup()
    }

    const playerInRange = this.getPlayerInRange()
    if (playerInRange) {
      const delta = subtract(playerInRange.position, this.position)
      if (delta.y > 32) this.jump()
      this.targetRotation = this.position.x > playerInRange.position.x ? -Math.PI : 0

      if (this.shouldShoot(playerInRange)) {
        this.attack()
      }
      
      return
    }

    this.isFacingRight = Math.random() > 0.9 ? !this.isFacingRight : this.isFacingRight
    this.moveInFacingDirection()
  }

  shouldShoot(targetPlayer) {
    if (targetPlayer.isInvisible()) return false
    return Math.random() < 0.1
  }

  executeTurn() {
    super.executeTurn()
    if (this.isDead) return

    const shouldAvoidThreat = this.assessAndReactToThreats()
    if (shouldAvoidThreat) return
    this.assessAndFollowGoal()
  }
}

module.exports = PlayerBot
