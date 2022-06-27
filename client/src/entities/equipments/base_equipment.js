const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BaseEquipment {
  static build(user) {
    return new this(user)
  }

  constructor(user) {
    this.user = user
    this.game = user.game

    this.init()
  }

  init() {
    this.sprites = []

    this.getSpriteContainers().forEach((parentSprite) => {
      let sprite = this.createSprite()
      parentSprite.addChild(sprite)

      this.sprites.push(sprite)
    })
  }

  getSpriteContainers() {
    return this.user.getEffectableSprites()
  }

  createSprite() {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    let sprite = new PIXI.Sprite(texture)
    
    sprite.anchor.set(0.5)

    sprite.width = this.getWidth()
    sprite.height = this.getHeight()
    sprite.position.x = this.getX()
    sprite.position.y = this.getY()
    sprite.rotation = this.getRotation() || 0

    return sprite
  }

  getSpritePath() {
    return ""
  }

  getRotation() {
    return this.getConstants().rotation * Math.PI / 180
  }

  getX() {
    return this.getConstants().x
  }

  getY() {
    return this.getConstants().y
  }

  getWidth() {
    return this.getConstants().width
  }

  getHeight() {
    return this.getConstants().height
  }

  getType() {
    throw new Error("must implement getType")
  }

  getConstants(type = this.getType()) {
    let klassName = Protocol.definition().EquipmentType[type]
    return Constants.Equipments[klassName]
  }

  remove() {
    this.sprites.forEach((sprite) => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite)
      }
    })

    this.sprites = []
  }

  renderArrowTargetColor() {

  }

  animate() {

  }

  setTargetRotation() {

  }

  onPrepareAttack() {

  }

  onAttack() {

  }
}

module.exports = BaseEquipment