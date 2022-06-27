const Arrow = require("./arrow")
const Protocol = require("../../../common/util/protocol")
const Explosion = require("./explosion")
const Constants = require("../../../common/constants.json")

class IceArrow extends Arrow {

  onProjectileConstructed() {
    this.MAX_DURATION = Constants.physicsTimeStep * 3
  }

  getType() {
    return Protocol.definition().ProjectileType.IceArrow
  }

  onHitEntity(entity, options = {}) {
    super.onHitEntity(entity, options)

    if (entity.isPlayer()) {
      return
    }


    if (options.raycastHit) {
      let entity = options.raycastHit.entity
      let raycastHit = options.raycastHit

      let hitDirection = entity.getHitDirection(raycastHit.x, raycastHit.y)
      this.createIceWallTowards(entity, hitDirection)
    }
  }

  createIceWallTowards(entity, hitDirection) {
    let row = entity.getRow()
    let col = entity.getCol()
    let height = 5
    let iceCreated = 0

    if (hitDirection === "left") {
      for (var i = 1; i <= height; i++) {
        if (this.stage.groundMap.get(row, col - i)) {
          break
        }
        this.stage.addIceWallAt(row, col - i)
        iceCreated++
      }
    } else if (hitDirection === "right") {
      for (var i = 1; i <= height; i++) {
        if (this.stage.groundMap.get(row, col + i)) {
          break
        }
        this.stage.addIceWallAt(row, col + i)
        iceCreated++
      }
    } else if (hitDirection === "up") {
      for (var i = 1; i <= height; i++) {
        if (this.stage.groundMap.get(row + i, col)) {
          break
        }
        this.stage.addIceWallAt(row + i, col)
        iceCreated++
      }
    } else if (hitDirection === "down") {
      for (var i = 1; i <= height; i++) {
        if (this.stage.groundMap.get(row - i, col)) {
          break
        }
        this.stage.addIceWallAt(row - i, col)
        iceCreated++
      }
    }

    if (iceCreated > 0) {
      this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.Ice })
    }
  }


}

module.exports = IceArrow
