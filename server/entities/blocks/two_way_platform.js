const Block = require("./block")
const Protocol = require("../../../common/util/protocol")

const WIDTH = 32
const HEIGHT = 16

class TwoWayPlatform extends Block {
  constructor(stage, options) {
    super(stage, options)

    this.width = WIDTH
    this.height = HEIGHT
    this.color = options.color || "#cccccc"
  }

  getType() {
    return Protocol.definition().BlockType.TwoWayPlatform
  }

  toExportJson() {
    let data = super.toExportJson()
    data.color = this.color
    return data
  }

  shouldPossiblyObstruct() {
    return true
  }

  shouldObstruct(entity) {
    if (!entity) return true

    if (entity.isArrow()) return false
    if (!entity.isPlayer()) return true

    let player = entity
    // going up, never obstruct
    if (player.velocity.y > 0) {
      player.setFallThroughBlock(null)
      return false
    }

    // going down

    // if my prev position already below this block, dont obstruct
    if (player.getLastY() < this.getY()) {
      return false
    }

    if (player.wantsToFallThrough) {
      if (player.getFallThroughBlock()) {
        if (player.getFallThroughBlock() !== this) {
          player.setWantsToFallThrough(false)
          return true
        } else {
          return false
        }
      } else {
        player.setFallThroughBlock(this)
        return false
      }
    }

    return true
  }
}

module.exports = TwoWayPlatform
