const Block = require("./block")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class ExplodingOrb extends Block {

  constructor(stage, options) {
    super(stage, options)

    this.shouldFall = false
  }

  getType() {
    return Protocol.definition().BlockType.ExplodingOrb
  }

  onProjectileHit(projectile) {
    this.remove()

    this.stage.addDestroyedObjects(this)

    this.stage.createProjectile("ExplodingOrb", {
      position: { x: this.getX(), y: this.getY() },
      rotation: 0,
      shooter: projectile.shooter
    })
  }

}

module.exports = ExplodingOrb