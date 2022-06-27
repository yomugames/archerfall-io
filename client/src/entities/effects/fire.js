const BaseEffect = require("./base_effect")
const Constants = require("../../../../common/constants.json")

class Fire extends BaseEffect {
  apply() {
    this.sprites = []

    this.affectedEntity.getEffectableSprites().forEach((sprite) => {
      let fireSprite = this.createSprite()
      fireSprite.position.set(0,-5)
      sprite.addChild(fireSprite)

      this.sprites.push(fireSprite)

      fireSprite = this.createSprite()
      fireSprite.position.set(-10,10)
      sprite.addChild(fireSprite)

      this.sprites.push(fireSprite)

      fireSprite = this.createSprite()
      fireSprite.position.set(5,20)
      sprite.addChild(fireSprite)

      this.sprites.push(fireSprite)
    })

    this.tween = this.startAnimationTween(this.sprites)

    if (this.affectedEntity.isMe()) {
      if (!game.soundManager.isSoundAlreadyPlaying("burning")) {
        game.soundManager.playSound("burning", { loop: true })
      }
    }
  }

  createSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.scale.set(1,-1)

    return sprite
  }

  getSpritePath() {
    return "fire.png"
  }

  remove() {
    if (this.tween) {
      this.tween.stop()
    }

    this.sprites.forEach((sprite) => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite)
      }
    })

    this.sprites = []

    if (this.affectedEntity.isMe()) {
      if (game.soundManager.isSoundAlreadyPlaying("burning")) {
        game.soundManager.stopSound("burning")
      }
    }
  }

  startAnimationTween(sprites) {
    const origWidth = sprites[0].width
    const maxExpansion = 10
    const desiredWidth = origWidth + maxExpansion
    let width = { width: origWidth }
    const widthToShiftPosition = origWidth 
    const amountToShift = (Constants.tileSize * 2) / origWidth + 5 // the smaller it is,  the more it shift around
    const origX = 0
    const origY = 0
    const shouldShift = false 
    const tweenSpeed = 300 

    var tween = new TWEEN.Tween(width)
        .to({ width: desiredWidth }, tweenSpeed)
        .onUpdate(() => {
          if (shouldShift && width.width === widthToShiftPosition) {
            let randomX = amountToShift/2 - Math.floor(Math.random() * amountToShift)
            let randomY = amountToShift/2 - Math.floor(Math.random() * amountToShift)
            sprites.forEach((sprite) => {
              sprite.position.set(origX + randomX, origY + randomY)
            })
          }

          sprites.forEach((sprite) => {
            sprite.width = width.width
            sprite.height = width.width
          })
        })
        .yoyo(true)
        .repeat(Infinity)

    tween.start()

    return tween
  }

}

module.exports = Fire