const BaseProjectile = require('./base_projectile')
const ClientHelper = require('../../util/client_helper')

class ChemicalExplosion extends BaseProjectile {

  onProjectileConstructed() {
    this.animateExplosion()
  }

  animateExplosion() {
    let origSize = this.width
    let randomOffset = Math.floor(Math.random() * 48) 
    this.sprite.alpha = Math.random() < 0.5 ? 1 : Math.random() + 0.4

    let width = { width: 8 }
    var tween = new TWEEN.Tween(width)
      .to({ width: origSize + randomOffset }, 150)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        this.sprite.width = width.width
        this.sprite.height = width.width
      })
      .onComplete(() => {
        this.sprite.alpha = 0
      })
  
    let opacity = { opacity: this.sprite.alpha }
    const fadeOutTween = new TWEEN.Tween(opacity)
      .to({ opacity: 0 }, 100)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.sprite.alpha = opacity.opacity
      })

    tween.chain(fadeOutTween)
    tween.start()
  }

  getSpritePath() {
    return 'chemical_explosion.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.ChemicalExplosion
  }

}

module.exports = ChemicalExplosion
