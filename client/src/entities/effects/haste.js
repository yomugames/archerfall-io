const BaseEffect = require("./base_effect")

class Haste extends BaseEffect {
  apply() {
    this.sprites = []

//     this.affectedEntity.getEffectableSprites().forEach((sprite) => {
//       let shieldSprite = this.createSprite()
//       sprite.addChild(shieldSprite)
// 
//       this.sprites.push(shieldSprite)
//     })
  }

  createSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)

    sprite.tint = 0x45a6d3
    sprite.alpha = 0.7
    sprite.width = 72
    sprite.height = 72

    return sprite
  }

  getSpritePath() {
    return "haste.png"
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

module.exports = Haste