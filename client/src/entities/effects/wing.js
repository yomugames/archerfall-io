const BaseEffect = require("./base_effect")

class Wing extends BaseEffect {
  apply() {
    this.sprites = []

    this.affectedEntity.getEffectableSprites().forEach((sprite) => {
      let effectSprite = this.createSprite()
      sprite.rearContainer.addChild(effectSprite)

      this.sprites.push(effectSprite)
    })
  }

  animateWingFlap() {
    this.sprites.forEach((sprite) => {
      this.animateWing(sprite.leftWing, 60 * Math.PI / 180)
      this.animateWing(sprite.rightWing, -60 * Math.PI / 180)
    })
  }

  animateWing(wing, targetRotation) {
    if (wing.wingFlapTween) {
      wing.wingFlapTween.stop()
      wing.rotation = 0
    }

    let rotation = { rotation: wing.rotation }

    const rotateDownTween = new TWEEN.Tween(rotation)
        .to({ rotation: targetRotation }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
           wing.rotation = rotation.rotation
        })

    const rotateUpTween = new TWEEN.Tween(rotation)
        .to({ rotation: wing.rotation }, 200)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
           wing.rotation = rotation.rotation
        })
 
    rotateDownTween.chain(rotateUpTween)

    rotateDownTween.start()

    wing.wingFlapTween = rotateDownTween
  }

  isWing() {
    return true
  }

  createSprite() {
    let container = new PIXI.Container()
    container.name = "Wings"

    let leftWing = this.createWingSprite('left_wing.png')
    leftWing.name = "LeftWing"
    leftWing.anchor.set(1,0.5)
    leftWing.position.x = -5

    let rightWing = this.createWingSprite('right_wing.png')
    rightWing.name = "RightWing"
    rightWing.anchor.set(0,0.5)
    rightWing.position.x = 5

    container.addChild(leftWing)
    container.addChild(rightWing)
    container.leftWing = leftWing
    container.rightWing = rightWing


    return container
  }

  createWingSprite(spritePath) {
    let texture = PIXI.utils.TextureCache[spritePath]
    let sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.scale.set(1,-1)
    sprite.position.y = 16

    return sprite
  }

  remove() {
    this.sprites.forEach((sprite) => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite)
      }
    })

    this.sprites = []
  }
}

module.exports = Wing