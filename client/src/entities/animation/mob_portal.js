const BaseAnimation = require("./base_animation")
const { lerp } = require("../../util/client_helper")
const ClientHelper = require("../../util/client_helper")

const OPEN_PORTAL_UNTIL = 0.25
const KEEP_PORTAL_UNTIL = 0.75
const CLOSE_PORTAL_UNTIL = 1

const WIDTH = { min: 16, max: 64 }
const HEIGHT = { min: 16, max: 64 }
const SIZE_OSCILLATION_FACTOR = 1.2

const COLOR = { start: "#0000ff", end: "#000000" }
const ALPHA = { min: 0.25, max: 0.75 }

const OSCILLATION = { color: 10, alpha: 5, size: 10 }

class MobPortal extends BaseAnimation {
  setup() {
    super.setup()

    this.startColor = this.getColor(0)
    this.endColor = this.getColor(1)

    this.game.playSound("mob_portal")
  }

  animate(deltaTime) {
    super.animate(deltaTime)

    if (this.progress <= OPEN_PORTAL_UNTIL) {
      const openingProgress = this.progress / OPEN_PORTAL_UNTIL
      this.openPortal(openingProgress)
    } else if (this.progress <= KEEP_PORTAL_UNTIL) {
      this.keepPortalOpen()
    } else {
      const closingProgress = (this.progress - KEEP_PORTAL_UNTIL) / (CLOSE_PORTAL_UNTIL - KEEP_PORTAL_UNTIL)
      this.closePortal(closingProgress)
    }

    this.animateColor()
    this.animateAlpha()
  }

  openPortal(progress) {
    this.sprite.width = lerp(WIDTH.min, WIDTH.max, progress)
    this.sprite.height = lerp(HEIGHT.min, HEIGHT.max, progress)
  }

  keepPortalOpen() {
    const sizeOscillation =
      Math.sin((this.runningTime - this.duration * OPEN_PORTAL_UNTIL) * OSCILLATION.size) * 0.5 + 0.5

    this.sprite.width = lerp(WIDTH.max, WIDTH.max * SIZE_OSCILLATION_FACTOR, sizeOscillation)
    this.sprite.height = lerp(HEIGHT.max, HEIGHT.max * SIZE_OSCILLATION_FACTOR, sizeOscillation)
  }

  closePortal(progress) {
    this.sprite.width = lerp(WIDTH.max, HEIGHT.min, progress)
    this.sprite.height = lerp(HEIGHT.max, HEIGHT.min, progress)
  }

  animateColor() {
    const colorOscillation = Math.sin(this.runningTime * OSCILLATION.color) * 0.5 + 0.5
    const color = lerp(this.startColor, this.endColor, colorOscillation)

    this.sprite.tint = color
  }

  animateAlpha() {
    const alphaOscillation = Math.sin(this.runningTime * OSCILLATION.alpha) * 0.5 + 0.5
    const alpha = lerp(ALPHA.min, ALPHA.max, alphaOscillation)

    // this.sprite.alpha = alpha
  }

  getColor(ratio) {
    return ClientHelper.getRandomColorInRange(COLOR.start, COLOR.end, ratio, {
      shouldReturnInteger: true,
    })
  }

  getSpritePath() {
    return "circle.png"
  }
}

module.exports = MobPortal
