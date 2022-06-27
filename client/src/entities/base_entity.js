const Interpolator = require("./../util/interpolator")
const Constants = require("./../../../common/constants.json")

class BaseEntity {
  constructor(game, data) {
    this.id = data.id

    this.data = data
    this.game = game
    this.stage = game.app.stage

    this.width = data.width || this.getDefaultWidth(data)
    this.height = data.height || this.getDefaultHeight(data)

    this.initSprite(data.position.x, data.position.y)
    this.registerEntity()
  }

  getDefaultWidth(data) {
    throw new Error("unimplemented getDefaultWidth")
  }

  getDefaultHeight(data) {
    throw new Error("unimplemented getDefaultHeight")
  }

  getId() {
    return this.id
  }

  registerEntity() {
    if (this.id) {
      this.game.registerGlobalEntity(this)
    }
  }

  isMovingEntity() {
    return true
  }

  onHighlighted() {}

  getSelectionWidth() {
    return this.getWidth()
  }

  getSelectionHeight() {
    return this.getHeight()
  }

  getSelectionRect() {
    return null
  }

  getSpriteToAttachSelection() {
    return this.sprite
  }

  unregisterEntity() {
    if (this.id) {
      this.game.unregisterGlobalEntity(this)
    }
  }

  initSprite(x, y) {
    this.addSprite(x, y)
  }

  addSprite(x, y) {
    let texture = PIXI.utils.TextureCache[this.getSpritePath()]
    this.sprite = this.createSprite(texture)

    if (this.sprite.anchor) this.sprite.anchor.set(0.5)

    this.sprite.position.set(x, y)
    this.sprite.width = this.getWidth()
    this.sprite.height = this.getHeight()

    this.getSpriteContainer().addChild(this.sprite)

    Interpolator.mixin(this.sprite)

    return this.sprite
  }

  playCustomAnimation(data) {}

  redrawSprite() {
    // do nothing by default
  }

  static getBox(x, y, w, h) {
    return {
      pos: {
        x: x - w / 2,
        y: y - h / 2,
      },
      w: w,
      h: h,
    }
  }

  isShip() {
    return false
  }

  getBox(x = this.getX(), y = this.getY(), w = this.getWidth(), h = this.getHeight()) {
    return {
      pos: {
        x: x - w / 2,
        y: y - h / 2,
      },
      w: w,
      h: h,
    }
  }

  getSprite() {}

  createSprite(texture) {
    return new PIXI.Sprite(texture)
  }

  getEffectableSprites() {
    return [this.sprite]
  }

  isPlayer() {
    return false
  }

  setAlpha(alpha) {
    this.sprite.alpha = alpha
  }

  setScaleX(scale) {
    this.sprite.scale.x = scale
  }

  instructToMove(x, y) {
    this.sprite.instructToMove(x, y)
  }

  instructToRotate(rotation) {
    this.sprite.instructToRotate(rotation)
  }

  instructToExpand(width) {
    this.sprite.instructToExpand(width)
  }

  interpolate(lastFrameTime) {
    this.sprite.interpolate(lastFrameTime)

    if (typeof this.rotation !== "undefined") {
      this.interpolateRotation(lastFrameTime)
    }
  }

  interpolateRotation(lastFrameTime) {
    this.sprite.interpolateRotation(lastFrameTime)
  }

  animateDamage() {
    if (this.spriteRestoreTimeout) return

    this.getTintableSprite().tint = 0xff6d6d // 0x555555

    this.spriteRestoreTimeout = setTimeout(() => {
      this.getTintableSprite().tint = 0xffffff
      this.spriteRestoreTimeout = null
      // this.shieldSprite.alpha = 1
    }, 100)
  }

  lightenColor(color, percent) {
    var num = parseInt(color, 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      B = ((num >> 8) & 0x00ff) + amt,
      G = (num & 0x0000ff) + amt

    return (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  }

  getTintableSprite() {
    return this.sprite
  }

  getSpriteContainer() {
    return this.stage
  }

  setRotation(degInRad) {
    this.rotation = degInRad
    this.sprite.rotation = degInRad
  }

  remove() {
    this.unregisterEntity()
    this.removeSelfAndChildrens(this.sprite)
  }

  removeSelfAndChildrens(sprite) {
    if (!sprite) return
    while (sprite.children[0]) {
      this.removeSelfAndChildrens(sprite.children[0])
    }

    if (sprite.parent) {
      sprite.parent.removeChild(sprite)
    }
  }

  renderEntityMenuStats() {}

  removeChildrens(sprite) {
    while (sprite.children[0]) {
      sprite.removeChild(sprite.children[0])
    }
  }

  isPlatform() {
    return false
  }

  isArmor() {
    return false
  }

  isUnit() {
    return false
  }

  getCollisionGroup() {
    return null
  }

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  getSpritePath() {
    throw "must implement getSpritePath"
  }

  getYScale() {
    return 1
  }

  getXScale() {
    return 1
  }

  getX() {
    return this.sprite.x
  }

  getY() {
    return this.sprite.y
  }
}

module.exports = BaseEntity
