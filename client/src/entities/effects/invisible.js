const BaseEffect = require("./base_effect")

class Invisible extends BaseEffect {
  apply() {
    this.sprites = []

    this.affectedEntity.getEffectableSprites().forEach((sprite) => {
      this.sprites.push(sprite)
    })

    this.tween = this.fadeOutSprites(this.sprites)
  }

  getFadeOpacity() {
    if (this.affectedEntity.isPlayer() && this.affectedEntity.isMe()) {
      return 0.3
    } else {
      return 0
    }
  }

  fadeOutSprites(sprites) {
    let opacity = { opacity: 1 }

    const fadeOutTween = new TWEEN.Tween(opacity)
        .to({ opacity: this.getFadeOpacity() }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          sprites.forEach((sprite) => {
            sprite.alpha = opacity.opacity
          })
        })

    fadeOutTween.start()

    return fadeOutTween
  }

  fadeInSprites(sprites) {
    let opacity = { opacity: this.getFadeOpacity() }

    const fadeInTween = new TWEEN.Tween(opacity)
        .to({ opacity: 1 }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          sprites.forEach((sprite) => {
            sprite.alpha = opacity.opacity
          })
        })

    fadeInTween.start()

    return fadeInTween
  }

  remove() {
    if (this.tween) {
      this.tween.stop()
    }

    this.fadeInSprites(this.sprites)

    this.sprites = []
  }
}

module.exports = Invisible