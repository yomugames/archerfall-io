const Animations = require("./index")

class AnimationManager {
  constructor(game) {
    this.game = game
    this.animations = []
  }

  playAnimation(data) {
    const { animationType, ...params } = data
    const Animation = Animations.forType(animationType)
    new Animation(this.game, params)
  }

  add(animation) {
    this.animations.push(animation)
  }

  remove(animation) {
    const index = this.animations.indexOf(animation)
    this.animations.splice(index, 1)
  }

  update(lastFrameTime) {
    const deltaTime = (new Date().getTime() - lastFrameTime) / 1000

    for (const animation of this.animations) {
      if (!animation) continue
      animation.animate(deltaTime)
    }
  }
}

module.exports = AnimationManager
