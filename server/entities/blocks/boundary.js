const Block = require("./block")
const Protocol = require("../../../common/util/protocol")
const MovingObject = require("./moving_object")

class Boundary extends Block {

  constructor(stage, data) {
    super(stage, data)
    this.direction = data.direction
  }

  getType() {
    return Protocol.definition().BlockType.Boundary
  }

  shouldLimitHorizontalMovement() {
    return false
  }

  shouldLimitVerticalMovement() {
    return false
  }

  applyGravity() {
    // dont fall
  }

  executeTurn() {
    let maxLeftX = this.stage.getCameraDisplacement() + this.stage.getCameraWidth() / 4
    let maxRightX = this.stage.getCameraDisplacement() + this.stage.getCameraWidth() - this.stage.getCameraWidth() / 4

    if (this.direction === "left") {
      if (this.position.x > maxRightX) {
        this.position.x -= 4
      }
    } else if (this.direction === "right") {
      if (this.position.x < maxLeftX) {
        this.position.x += 4
      }
    }

    this.detectPlayerCollision()
  }

  detectPlayerCollision() {
    this.stage.forEachPlayer((player) => {
      let isIntersect = this.stage.isAABBIntersect(this.getBox(), player.getBox())
      if (isIntersect) {
        this.onPlayerCollide(player)
      }
    })
  }

  onPlayerCollide(player) {
    player.die()
  }

  isTemporary() {
    return true
  }

}


Object.assign(Boundary.prototype, MovingObject.prototype, {
})

module.exports = Boundary
