const BaseEntity = require("../base_entity")
const Constants = require("../../../../common/constants.json")

class BaseAnimation extends BaseEntity {
  constructor(game, data) {
    super(game, data.setupData)

    // default values, will be overwritten by what's in data.setupData
    this.setupData = {
      position: {
        x: 0,
        y: 0,
      },
      rotation: 0,
      width: Constants.tileSize,
      height: Constants.tileSize,
      anchor: { x: 0.5, y: 0.5 },
      scale: 1,
      ...data.setupData,
    }

    this.loop = data.loop || false
    this.duration = data.duration || 1

    this.runningTime = 0

    this.start()
  }

  registerEntity() {
    this.game.animationManager.add(this)
  }

  unregisterEntity() {
    this.game.animationManager.remove(this)
  }

  getSpritePath() {
    return "circle.png"
  }

  setup() {
    const { position, rotation, width, height, scale, anchor } = this.setupData
    const { x, y } = position

    this.sprite.position.set(x, y)

    this.sprite.width = width
    this.sprite.height = height

    this.sprite.rotation = rotation

    isNaN(scale) ? this.sprite.scale.set(scale.x, scale.y) : this.sprite.scale.set(scale)
    isNaN(anchor) ? this.sprite.anchor.set(anchor.x, anchor.y) : this.sprite.anchor.set(anchor)
  }

  start() {
    this.runningTime = 0
    this.progress = 0
    this.setup()
  }

  animate(deltaTime) {
    this.runningTime += deltaTime
    this.progress = this.runningTime / this.duration

    if (this.duration && this.runningTime >= this.duration) {
      if (this.loop) {
        this.start()
      } else {
        this.onAnimationEnd()
        this.remove()
      }
    }
  }

  onAnimationEnd() {}

  getSpriteContainer() {
    return this.game.levelContainer
  }

  getDefaultWidth() {
    return 32
  }

  getDefaultHeight() {
    return 32
  }
}

module.exports = BaseAnimation
