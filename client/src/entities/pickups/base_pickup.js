const BaseEntity = require("../base_entity")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const BitmapText = require("../../util/bitmap_text")
const Interpolator = require("../../util/interpolator")

class BasePickup extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }

  constructor(game, data) {
    super(game, data)

    this.addBubble()

    this.tween = this.getFloatingTween()
    this.tween.start()

    this.game.playSound("appear")
  }

  isArrow() {
    return false
  }

  addSprite(x, y) {
    this.sprite = new PIXI.Container()
    this.sprite.name = "PickupContainer"
    this.sprite.interactive = false

    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    this.pickupSprite = this.createSprite(texture)
    this.pickupSprite.name = "Pickup"
    this.pickupSprite.anchor.set(0.5)
    this.pickupSprite.scale.set(1,-1)
    this.pickupSprite.width = this.width
    this.pickupSprite.height = this.height

    if (this.getConstants(this.getType()).outlined) {
      this.pickupSprite.filters = [this.game.outlineFilter]
    }

    this.sprite.addChild(this.pickupSprite)
    this.sprite.position.set(x, y)

    this.getSpriteContainer().addChild(this.sprite)

    Interpolator.mixin(this.sprite)

    return this.sprite
  }

  getTypeName() {
    return Protocol.definition().PickupType[this.getType()] 
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  addBubble() {
    let texture = PIXI.utils.TextureCache["shield.png"]
    let bubble = new PIXI.Sprite(texture)
    bubble.width = Constants.tileSize * 1.5
    bubble.height = Constants.tileSize * 1.5
    bubble.anchor.set(0.5)
    bubble.alpha = 0.3
    bubble.name = "Bubble"
    this.sprite.addChild(bubble)
  }

  getDefaultWidth(data) {
    return this.getConstants(data.type).width
  }

  getDefaultHeight(data) {
    return this.getConstants(data.type).height
  }

  getConstants(type) {
    let klassName = Protocol.definition().PickupType[type]
    return Constants.Pickups[klassName]
  }

  registerEntity() {
    super.registerEntity()

    this.game.addPickup(this)
  }

  unregisterEntity() {
    super.unregisterEntity()

    this.game.removePickup(this)
  }

  remove(data) {
    super.remove()

    this.cleanupTween()

    if (data && data.acquired) {
      this.animateAcquired(data.type)
    }
  }

  animateAcquired(type) {
    let yLength = 64
    let duration = 1000

    let klassName = Protocol.definition().PickupType[type]
    klassName = klassName.match(/[A-Z][a-z]+|[0-9]+/g).join(" ")

    const text = BitmapText.create({
      label: "Acquired",
      text: "+ " + klassName,
      size: 24,
      spriteContainer: this.game.app.stage
    })

    let dimensions = {
      x: this.getX(),
      y: this.getY() + Constants.tileSize,
    }

    text.sprite.position.set(dimensions.x, dimensions.y)
    text.sprite.scale.y = -1

    new TWEEN.Tween(dimensions) 
        .to({ x: dimensions.x, y: dimensions.y + yLength }, duration) 
        .easing(TWEEN.Easing.Quadratic.Out) 
        .onUpdate(() => { 
          text.sprite.position.y = dimensions.y
        })
        .onComplete(() => {
          text.remove()
        }) 
        .start()
  }

  getFloatingTween() {
    let origPosition = this.sprite.position.y
    let origWidth    = this.sprite.width

    let delta = { delta: 0 }

    return new TWEEN.Tween(delta)
        .to({ delta: 20 }, 1000)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          this.sprite.width  = origWidth + delta.delta / 4
          this.sprite.height = origWidth + delta.delta / 4
          this.sprite.position.y = origPosition + delta.delta
        })
        .yoyo(true)
        .repeat(Infinity)
  }

}

module.exports = BasePickup
