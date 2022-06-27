const BaseEquipment = require("./base_equipment")

class Bow extends BaseEquipment {

  getType() {
    return Protocol.definition().EquipmentType.Bow
  }
  
  createSprite() {
    let container = new PIXI.Container()
    container.name = "BowContainer"
    container.alpha = 0

    if (this.user.isHomeCharacter()) {
      container.scale.set(0.8)
    }

    let texture = PIXI.utils.TextureCache["base_bow.png"]
    let bowSprite = new PIXI.Sprite(texture)
    bowSprite.name = "BaseBow"
    // bowSprite.height = 4
    bowSprite.anchor.set(0.5)
    bowSprite.position.x = 48
    bowSprite.tint = 0x894e2d
    bowSprite.filters = [this.game.outlineFilter]
    container.bow = bowSprite

    let stringSprite = new PIXI.Sprite(PIXI.utils.TextureCache["string.png"])
    stringSprite.name = "String"
    stringSprite.anchor.set(0.5)
    stringSprite.position.x = 32
    container.string = stringSprite

    container.addChild(bowSprite)
    container.addChild(stringSprite)

    let arrow

    if (this.user.isMe()) {
      arrow = new PIXI.Sprite(PIXI.utils.TextureCache["arrow_hand.png"])
      arrow.name = "ArrowHand"
      arrow.anchor.set(0.5)
      arrow.position.x = 64
      arrow.tint = 0x894e2d
      arrow.filters = [this.game.outlineFilter]
      container.arrow = arrow
      container.addChild(arrow)
    }

    return container
  }

  renderArrowTargetColor(color) {
    this.sprites.forEach((sprite) => {
      sprite.arrow.tint = color
    })
  }

  animate(data) {
    if (this.user.isMe()) return
    let rotation = data.rotation

    this.showBowSprite(rotation)

    if (this.hideBowSpriteTimeout) clearTimeout(this.hideBowSpriteTimeout)
    this.hideBowSpriteTimeout = setTimeout(() => {
      this.hideBowSprite()
    }, 400)
  }

  showBowSprite(rotation) {
    this.sprites.forEach((sprite) => {
      sprite.alpha = 1
      sprite.rotation = rotation
    })
  }

  hideBowSprite() {
    this.sprites.forEach((sprite) => {
      sprite.alpha = 0
    })
  }

  setTargetRotation(rotation) {
    this.sprites.forEach((sprite) => {
      sprite.rotation = rotation
    })
  }

  onPrepareAttack() {
    if (this.user.hasNoAmmo()) return

    this.sprites.forEach((sprite) => {
      sprite.alpha = 1
    })
  }

  onAttack() {
    this.hideBowSprite()
  }
}

module.exports = Bow