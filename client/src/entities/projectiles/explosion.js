const BaseProjectile = require('./base_projectile')
const ClientHelper = require('../../util/client_helper')

class Explosion extends BaseProjectile {

  onProjectileConstructed() {
    this.game.playSound("explosion")

    this.animateExplosion()

    const smokeCount = 6
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }
  }

  animateExplosion() {
    let origSize = this.width

    let width = { width: 32 }
     var tween = new TWEEN.Tween(width)
      .to({ width: origSize }, 200)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        this.sprite.width = width.width
        this.sprite.height = width.width
      })
      .start()
  }

  getSpritePath() {
    return 'explosion.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Explosion
  }

}

module.exports = Explosion
