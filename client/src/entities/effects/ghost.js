const BaseEffect = require("./base_effect")

class Ghost extends BaseEffect {
  apply() {
    this.sprites = []

    this.affectedEntity.getEffectableSprites().forEach((sprite) => {
      this.sprites.push(sprite)
    })

    this.tween = this.fadeOutSprites(this.sprites)
  }

  fadeOutSprites(sprites) {
    let opacity = { opacity: 0.7 }

    const fadeOutTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0.5 }, 80)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          sprites.forEach((sprite) => {
            sprite.alpha = opacity.opacity
          })
        })
        .repeat(Infinity)
        .yoyo(true)

    fadeOutTween.start()

    return fadeOutTween
  }

  remove() {
    if (this.tween) {
      this.tween.stop()
    }

    this.sprites.forEach((sprite) => {
      sprite.alpha = 1
    })

    this.sprites = []
  }
}

module.exports = Ghost