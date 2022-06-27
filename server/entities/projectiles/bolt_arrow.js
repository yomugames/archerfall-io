const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Explosion = require("./explosion")
const Constants = require("../../../common/constants.json")
const BoltManager = require("./bolt_manager")
const Helper = require("../../../common/helper")

class BoltArrow extends Arrow {

  getType() {
    return Protocol.definition().ProjectileType.BoltArrow
  }

  remove() {
    super.remove()
  }

  createBolts() {
    this.createBolt()
  }

  getRemoveCountdown() {
    return 1
  }

  onCCDHitTile(raycastHit) {
    super.onCCDHitTile(raycastHit)
    this.createBolts()
  }

  getBoltSpawnPoint() {
    let lastX = this.getLastX()
    let lastY = this.getLastY()
    let neighbors = this.stage.groundMap.getNeighborsAllowEmpty(this.getRow(), this.getCol())
    
    let emptyNeighbors = neighbors.filter((neighbor) => {
      let isEmpty = !neighbor.entity
      return isEmpty
    })
    
    let emptyNeighborsSortedByDistanceFromLastPos = emptyNeighbors.sort((a, b) => {
      let distanceA = Helper.distance(
        lastX, 
        lastY, 
        Helper.convertGridToPosition(a.col), 
        Helper.convertGridToPosition(a.row)
      )

      let distanceB = Helper.distance(
        lastX, 
        lastY, 
        Helper.convertGridToPosition(b.col), 
        Helper.convertGridToPosition(b.row)
      )

      return distanceA - distanceB
    })
    
    return emptyNeighborsSortedByDistanceFromLastPos[0]
  }

  createBolt() {
    const boltManager = new BoltManager()

    const sourceTile = this.getBoltSpawnPoint()

    if (!sourceTile) return
    let sourcePoint = {
      x: sourceTile.col * Constants.tileSize + Constants.tileSize / 2,
      y: sourceTile.row * Constants.tileSize + Constants.tileSize / 2
    }

    this.stage.createProjectile("Bolt", {
      boltManager: boltManager,
      position: { x: sourcePoint.x, y: sourcePoint.y },
      rotation: 0,
      shooter: this.shooter
    })
    
    this.stage.createProjectile("Bolt", {
      boltManager: boltManager,
      position: { x: sourcePoint.x, y: sourcePoint.y },
      rotation: 0,
      shooter: this.shooter
    })
  }

}

module.exports = BoltArrow