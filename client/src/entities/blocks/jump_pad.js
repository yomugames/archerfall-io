const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")
const Interpolator = require("../../util/interpolator")
const Constants = require("./../../../../common/constants.json")

class JumpPad extends Block {
  constructor(game, data) {
    super(game, data)
  }

  getSpritePath() {
    return "jump_pad.png"
  }

  getType() {
    return Protocol.definition().BlockType.JumpPad
  }

  getDefaultWidth() {
    return Constants.tileSize * 2
  }

  addSprite(x, y) {
    let container = new PIXI.Container()
    container.name = "JumpPad"

    this.springSprite = new PIXI.Sprite(PIXI.utils.TextureCache["jump_pad_spring.png"])
    this.springSprite.name = "JumpPadSpring"
    this.springSprite.anchor.set(0.5)

    this.baseSprite   = new PIXI.Sprite(PIXI.utils.TextureCache["jump_pad_base.png"])
    this.baseSprite.name = "JumpPadBase"
    this.baseSprite.anchor.set(0.5)
    this.baseSprite.position.y = 8

    container.addChild(this.baseSprite)
    container.addChild(this.springSprite)

    this.sprite = container

    this.sprite.position.set(x, y)

    this.getSpriteContainer().addChild(this.sprite)

    Interpolator.mixin(this.sprite)

    return this.sprite
  }

  playCustomAnimation() {
    if (this.tween) {
      this.tween.stop()
    }

    this.tween = this.getAnimationTween()
    this.tween.start()
  }

  getAnimationTween() {
    let sprite = this.springSprite

    let origPosition = sprite.position.y

    let position = { position: origPosition }

    return new TWEEN.Tween(position)
        .to({ position: origPosition - 32 }, 120)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          sprite.position.y = position.position
        })
        .onComplete(() => {
          sprite.position.y = origPosition
        })
        .yoyo(true)
 
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

}

module.exports = JumpPad