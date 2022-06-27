const BaseProjectile = require('./base_projectile')
const ClientHelper = require('../../util/client_helper')

class Bolt extends BaseProjectile {

  onProjectileConstructed() {
    this.tween = this.getAnimationTween()
    this.tween.start()

    this.game.soundManager.playSound("bolt")
  }

  getAnimationTween() {
    let rotation = { rotation: 0 }

    return new TWEEN.Tween(rotation)
        .to({ rotation: 360 * Math.PI / 180 }, 1000)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          this.sprite.rotation  = rotation.rotation
        })
        .repeat(Infinity)
  }

  syncWithServer(data) {
    this.instructToMove(data.position.x , data.position.y)
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }


  getSpritePath() {
    return 'bolt.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Bolt
  }

}

module.exports = Bolt
