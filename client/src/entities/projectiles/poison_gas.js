const BaseProjectile = require("./base_projectile")
const { lerp } = require("../../util/client_helper")
const ClientHelper = require("../../util/client_helper")

const INTERP_FRAMES = 6

class PoisonGas extends BaseProjectile {
  onProjectileConstructed() {
    this.sprite.tint = ClientHelper.getRandomColorInRange("#a7e6a7", "#6aa56a", Math.random(), {
      shouldReturnInteger: true,
    })

    this.targetSize = this.data.width
    this.progressSinceLastServerUpdate = 0
    this.secondsSinceSpawn = 0

    this.originColor = this.getPoisonColor(0)
    this.targetColor = this.getPoisonColor(1)

    this.game.soundManager.playSound("gas_release")
  }

  syncWithServer(data) {
    super.syncWithServer(data)

    this.previousTargetSize = this.targetSize
    this.targetSize = data.width
    this.progressSinceLastServerUpdate = 0
  }

  getPoisonColor(ratio) {
    return ClientHelper.getRandomColorInRange("#a7e6a7", "#6aa56a", ratio, {
      shouldReturnInteger: true,
    })
  }

  setSpriteSize(size) {
    this.sprite.width = size
    this.sprite.height = size
  }

  interpolate(lastFrameTime) {
    super.interpolate(lastFrameTime)

    const time = new Date().getTime()
    const deltaTime = time - lastFrameTime
    this.secondsSinceSpawn += deltaTime / 1000
    this.progressSinceLastServerUpdate += 1 / INTERP_FRAMES

    this.setSpriteSize(lerp(this.previousTargetSize, this.targetSize, this.progressSinceLastServerUpdate))
    // this.sprite.tint = this.lerp(this.originColor, this.targetColor, Math.sin(this.secondsSinceSpawn * 0.1) * 0.5 + 0.5)
  }

  getFilters() {
    return []
  }

  remove() {
    this.fadeOutAnimation(() => {
      super.remove()
    })
  }

  fadeOutAnimation(cb) {
    let opacity = { opacity: this.sprite.alpha }
    const fadeOutTween = new TWEEN.Tween(opacity)
      .to({ opacity: 0 }, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.sprite.alpha = opacity.opacity
      })
      .onComplete(() => {
        if (!cb) return
        cb()
      })

    fadeOutTween.start()
  }

  getSpritePath() {
    return "circle.png"
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonGas
  }
}

module.exports = PoisonGas
