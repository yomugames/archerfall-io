const BaseEntity = require("./base_entity")
const Constants = require("./../../../common/constants")
const Interpolator = require("./../util/interpolator")

class DuplicatedEntity extends BaseEntity {

  initSprite(x, y) {
    this.initBodies()

    this.bodies.main["sprite"] = this.addSprite(x,y)

    if (this.shouldCreateMirror()) {
      this.bodies.leftMirror["sprite"] =  this.addSprite(x - this.game.getCameraWidth(), y)
      this.bodies.rightMirror["sprite"] = this.addSprite(x + this.game.getCameraWidth(), y)
    }
  }

  shouldCreateMirror() {
    return true
  }

  initBodies() {
    this.bodies = {
      main: {}
    }

    if (this.shouldCreateMirror()) {
      this.bodies.leftMirror = {}
      this.bodies.rightMirror = {}
    }
  }

  getEffectableSprites() {
    return Object.values(this.bodies).map((body) => {
      return body.sprite
    })
  }

  getDamagedTween() {
    let opacity = { opacity: 0.8 }

    const fadeOutTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0.5 }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.forEachBodies((key, body) => {
            body.sprite.alpha = opacity.opacity

          })
        })
        .onComplete(() => {
          this.forEachBodies((key, body) => {
            body.sprite.alpha = 1
          })
        })
        .repeat(2)
        .yoyo(true)

    return fadeOutTween
  }

  forEachBodies(cb) {
    for (let key in this.bodies) {
      cb(key, this.bodies[key])
    }
  }

  getSpriteFor(key) {
    return this.bodies[key].sprite
  }

  instructToMove(x, y) {
    this.getSpriteFor("main").instructToMove(x, y)

    if (this.shouldCreateMirror()) {
      this.getSpriteFor("leftMirror").instructToMove(x - this.game.getCameraWidth(), y)
      this.getSpriteFor("rightMirror").instructToMove(x + this.game.getCameraWidth(), y)
    }
  }

  setAlpha(alpha) {
    this.forEachBodies((key, body) => {
      body.sprite.alpha = alpha
    })
  }

  setSpriteTexture(texture) {
    this.forEachBodies((key, body) => {
      body.sprite.texture = texture
    })
  }


  setScaleX(scale) {
    this.forEachBodies((key, body) => {
      body.sprite.scale = scale
    })
  }

  setImmediatePosition(x, y) {
    this.getSpriteFor("main").setImmediatePosition(x, y)
    
    if (this.shouldCreateMirror()) {
      this.getSpriteFor("leftMirror").setImmediatePosition(x - this.game.getCameraWidth(), y)
      this.getSpriteFor("rightMirror").setImmediatePosition(x + this.game.getCameraWidth(), y)
    }
  }

  setRotation(degInRad) {
    this.forEachBodies((key, body) => {
      body.sprite.rotation = degInRad
    })
  }

  interpolate(lastFrameTime) {
    this.forEachBodies((key, body) => {
      body.sprite.interpolate(lastFrameTime)
    })
  }

  remove() {
    super.remove()
    this.forEachBodies((key, body) => {
      this.getSpriteContainer().removeChild(body.sprite)
    })
  }
    
  getX() {
    return this.getSpriteFor("main").x
  }

  getY() {
    return this.getSpriteFor("main").y
  }

  getYScale() {
    return -1
  }

  getXScale() {
    return 1
  }

}

module.exports = DuplicatedEntity