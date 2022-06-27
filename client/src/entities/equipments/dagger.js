const BaseEquipment = require("./base_equipment")
const Protocol = require("../../../../common/util/protocol")

class Dagger extends BaseEquipment {
  getSpritePath() {
    return "dagger.png"
  }

  getSpriteContainers() {
    return this.user.getEffectableSprites().map((parentSprite) => {
      return parentSprite.armature.armature.getSlot("right_lower_arm").display
    })
  }
  
  getType() {
    return Protocol.definition().EquipmentType.Dagger
  }

  animate(data) {
    let sprite = this.createSlashSprite(data.isFacingRight)
    this.game.effectsContainer.addChild(sprite)
    this.user.gotoAndStopByFrame("run", 2)

    this.game.soundManager.playSound("arrow")

    setTimeout(() => {
      sprite.parent.removeChild(sprite)
      this.user.playAnimation("idle")
    }, 100)
  }

  createSlashSprite(isFacingRight) {
    let texture = PIXI.utils.TextureCache["slash.png"]
    const sprite = new PIXI.Sprite(texture) 
    sprite.name = "Slash"
    sprite.position.set(this.user.getX(), this.user.getY() - 30)
    sprite.scale.x = isFacingRight ? 1 : -1
    return sprite
  }
}

module.exports = Dagger