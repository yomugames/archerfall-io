const BaseProjectile = require("./base_projectile")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Helper = require("../../../common/helper")

class Bolt extends BaseProjectile {

  constructor(stage, options = {}) {
    super(stage, options)

    this.boltManager = options.boltManager

    this.currentTile = this.getCoord()
    this.boltManager.takeTile(this.currentTile[0], this.currentTile[1])

    let nextTile    = this.findNextTile()
    this.setNextTileAndVelocity(nextTile)

    this.MAX_DURATION = Constants.physicsTimeStep * 4
  }

  onProjectileConstructed() {
  }

  getOptions() {
    return {}
  }

  isSameTile(tile, otherTile) {
    if (!otherTile) return false
    return tile[0] === otherTile[0] &&
           tile[1] === otherTile[1]
  }

  findNextTile() {
    let row = this.currentTile[0]
    let col = this.currentTile[1]

    let nextTile

    let neighbors = this.stage.groundMap.getNeighborsAllowEmpty(row, col)
    for(let i = 0; i < neighbors.length; i++) {
      let neighbor = neighbors[i]
      let isEmpty = !neighbor.entity
      if (isEmpty) {
        let nonEmptyNeighbors = this.getCollidableNonEmptyNeighbors(neighbor.row, neighbor.col)
        if (nonEmptyNeighbors.length > 0) {
          if (!this.boltManager.hasBeenTaken(neighbor.row, neighbor.col)) {
            nextTile = [neighbor.row, neighbor.col]
            // console.log("nextTile: " + nextTile.join("-"))
            break
          }
        }
      }
    }

    return nextTile
  }

  getCollidableNonEmptyNeighbors(row, col) {
    let neighbors = this.stage.groundMap.getNeighborsWithDiagonal(row, col)
    return neighbors.filter((neighbor) => {
      return neighbor.entity.shouldObstruct(this)
    })
  }

  setNextTileAndVelocity(nextTile) {
    this.nextTile = nextTile
    if (!nextTile) return

    this.boltManager.takeTile(nextTile[0], nextTile[1])

    let prevRotation = this.rotation

    this.velocity.x = this.getSpeed() * (nextTile[1] - this.currentTile[1])
    this.velocity.y = this.getSpeed() * (nextTile[0] - this.currentTile[0])

    this.rotation = Math.atan2(this.velocity.y, this.velocity.x)

    if (this.rotation !== prevRotation) {
      // ensure current position at center of current tile at next tick
      this.targetPosition = {
        x: this.getCol() * Constants.tileSize + Constants.tileSize / 2,
        y: this.getRow() * Constants.tileSize + Constants.tileSize / 2
      }

      this.manualSetPosition = true
    }
  }

  setXFromVelocity() {
    if (this.manualSetPosition) {
      this.position.x = this.targetPosition.x
    } else {
      super.setXFromVelocity()
    }
  }

  setYFromVelocity() {
    if (this.manualSetPosition) {
      this.position.y = this.targetPosition.y
    } else {
      super.setYFromVelocity()
    }
  }

  onTeleportToCenter() {
    super.onTeleportToCenter()
    
    this.currentTile = this.getCoord()

    let nextTile    = this.findNextTile()
    this.setNextTileAndVelocity(nextTile)
  }

  executeTurn() {
    super.executeTurn()

    if (this.durationTimestamp > this.MAX_DURATION) {
      this.remove()
    }

    if (this.manualSetPosition) {
      this.manualSetPosition = false
      return
    }

    if (!this.nextTile) {
      this.remove()
      return
    }

    this.currentTile = this.getCoord()
    if (!this.isSameTile(this.currentTile, this.nextTile)) return


    let nextTile = this.findNextTile()
    this.setNextTileAndVelocity(nextTile)
  }

  markHitObjectAndRemove() {

  }
  
  getType() {
    return Protocol.definition().ProjectileType.Bolt
  }

  onHitPlayer(player) {
    super.onHitPlayer(player)
  }

  applyGravity() {

  }

}

module.exports = Bolt