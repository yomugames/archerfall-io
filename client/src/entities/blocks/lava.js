const Block = require("./block")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class Lava extends Block {
  constructor(game, data) {
    super(game, data)

    if (Math.random() < 0.20) {
      this.animateLava()
    }

    this.sprite.alpha = 0.8
  }

  getSpritePath() {
    return "lava.png"
  }

  isForeground() {
    return true
  }

  getType() {
    return Protocol.definition().BlockType.Lava
  }

  animateLava() {
    if (this.tween) return
    if (this.bubbleSprite) return

    this.bubbleSprite = this.getBubbleSprite()
    this.getSpriteContainer().addChild(this.bubbleSprite)
    let randomOffset = Math.floor(Math.random() * 6) + 10

    let position = { y: this.getY() }
    let randomDuration = Math.floor(Math.random() * 700) + 400

    this.tween = new TWEEN.Tween(position)
        .to({ y: this.getY() + randomOffset }, randomDuration)
        .onUpdate(() => {
          this.bubbleSprite.position.y  = position.y
        })
        .onComplete(() => {
          this.bubbleSprite.parent.removeChild(this.bubbleSprite)
          this.tween = null
        })
        .repeat(Infinity)
        .yoyo(true)

    this.tween.start()
  }

  getBubbleSprite() {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["lava_bubble.png"])
    sprite.anchor.set(0.5)

    let randomWidth = Math.floor(Math.random() * 16) + 16
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()
    sprite.alpha = 0.8

    return sprite
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

    if (this.bubbleSprite) {
      this.bubbleSprite.parent.removeChild(this.bubbleSprite)
      this.bubbleSprite = null
    }
  }


}

module.exports = Lava