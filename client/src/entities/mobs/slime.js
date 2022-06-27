const BaseMob = require("./base_mob")

class Slime extends BaseMob {

  onMobConstructed() {
    this.registerAnimationTween(this.getAnimationTween()).start()
  }
  
  getAnimationTween() {
    let delta = { delta: 0 }
    let origSize = this.sprite.width

    const tween = new TWEEN.Tween(delta)
        .to({ delta: 6 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.sprite.width = origSize + delta.delta
          this.sprite.height = origSize - delta.delta
        })
        .repeat(Infinity)
        .yoyo(true)

    return tween
  }

  getType() {
    return Protocol.definition().MobType.Slime
  }

  getSpritePath() {
    return "blue_slime.png"
  }
}

module.exports = Slime