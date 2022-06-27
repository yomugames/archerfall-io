const BaseEffect = require("./base_effect")
const Constants = require("../../../../common/constants.json")

const RADIUS = Constants.Pickups.RotatingDart.radius
const SIZE = 32
const COLOR = 0xffffff
const RADIAL_SPEED = 0.07

class RotatingDart extends BaseEffect {
  apply() {
    this.sprites = []
    this.animations = []

    this.angle = 0

    this.affectedEntity.getEffectableSprites().forEach((sprite) => {
      let shieldSprite = this.createSprite()
      sprite.addChild(shieldSprite)

      this.sprites.push(shieldSprite)
    })

    this.createAnimations()
  }

  createSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)

    sprite.tint = COLOR
    sprite.width = SIZE
    sprite.height = SIZE

    sprite.position.x = RADIUS
    sprite.position.y = 0
    sprite.filters = [game.outlineFilter]

    return sprite
  }

  createAnimations() {
    this.sprites.forEach((sprite) => {
      const animation = new TWEEN.Tween().to({}, Number.POSITIVE_INFINITY).onUpdate(() => {
        this.angle += RADIAL_SPEED
        sprite.position.x = Math.cos(this.angle) * RADIUS
        sprite.position.y = Math.sin(this.angle) * RADIUS
      })

      this.animations.push(animation)
      animation.start()
    })
  }

  getSpritePath() {
    return "shuriken.png"
  }

  remove() {
    this.sprites.forEach((sprite) => sprite.parent && sprite.parent.removeChild(sprite))
    this.sprites = []

    this.animations.forEach((animation) => animation.stop())
    this.animations = []
  }
}

module.exports = RotatingDart
