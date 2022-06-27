const BaseEffect = require("./base_effect")

class DoubleShot extends BaseEffect {
  apply() {
    this.sprites = []
  }

  getSpritePath() {
    return "double_shot.png"
  }

  remove() {
    this.sprites = []
  }
}

module.exports = DoubleShot