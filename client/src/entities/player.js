const BaseEntity = require("./base_entity")
const DuplicatedEntity = require("./duplicated_entity")
const BitmapText = require("../util/bitmap_text")
const Interpolator = require("../util/interpolator")
const Protocol = require("../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const ClientHelper = require("../util/client_helper")
const Effects = require("./effects/index")
const Projectiles = require("./projectiles/index")
const Equipments = require("./equipments/index")

class Player extends DuplicatedEntity {
  constructor(game, data) {
    super(game, data)

    this.name = data.name
    this.effectInstances = {}

    this.forEachBodies((key, body) => {
      body.sprite.armature.filters = [this.game.outlineFilter]

      if (!this.isHomeCharacter()) {
        body.usernameSprite = this.createUsernameSprite()
        body.usernameSprite.alpha = 1
        body.sprite.addChild(body.usernameSprite)

        let bulletData = this.createReloadSprite()
        body.sprite.addChild(bulletData.bulletContainer)

        body.bulletContainer = bulletData.bulletContainer
        body.bulletSlots = bulletData.bulletSlots
        body.bulletFills = bulletData.bulletFills
      }
    })

    if (data.hat) {
      this.assignHat(data.hat)
    }

    if (data.color) {
      this.assignColor(data.color)
    }
  }

  shouldCreateMirror() {
    return !this.isHomeCharacter()
  }

  isHomeCharacter() {
    return this.data.isHomeCharacter
  }

  isHost() {
    return this.data.isHost
  }

  assignColor(colorString) {
    let color = ClientHelper.hexToInt(colorString)

    this.forEachBodies((key, body) => {
      body.sprite.armature.children.forEach((child) => {
        child.tint = color
      })
    })
  }

  assignHat(hat) {
    if (hat.length > 0) {
      this.forEachBodies((key, body) => {
        let headSprite = body.sprite.armature.armature.getSlot("head").display

        // remove existing
        if (body.hatSprite && body.hatSprite.parent) {
          body.hatSprite.parent.removeChild(body.hatSprite)
        }

        if (Constants.Hats[hat]) {
          body.hatSprite = this.createHatSprite(hat)
          headSprite.addChild(body.hatSprite)
        }
      })
    }
  }

  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b
    })

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  hexToRgbMultiplier(hex) {
    let data = this.hexToRgb(hex)
    return {
      r: data.r / 255,
      g: data.g / 255,
      b: data.b / 255,
    }
  }

  createReloadSprite() {
    let container = new PIXI.Container()
    container.name = "ReloadContainer"
    container.position.y = 85
    container.filters = [this.game.outlineFilter]

    let slotCount = 4
    let bulletSlots = []
    let bulletFills = []

    let width = 6
    let height = 12
    let margin = 4
    let totalLength = width * 4 + margin * 3
    let offsetX = width + margin
    let startX = 0 - totalLength / 2 + width / 2
    let currentX = startX

    for (var i = 0; i < slotCount; i++) {
      let bulletSlot = new PIXI.Sprite(PIXI.utils.TextureCache["bullet_slot.png"])
      bulletSlot.name = "BulletSlot"
      bulletSlot.width = width
      bulletSlot.height = height
      bulletSlot.alpha = 0.5
      bulletSlot.anchor.set(0.5)
      bulletSlot.position.x = currentX
      bulletSlots.push(bulletSlot)

      let bulletFill = new PIXI.Sprite(PIXI.utils.TextureCache["bullet_fill.png"])
      bulletFill.name = "BulletFill"
      bulletFill.width = width
      bulletFill.height = height
      bulletFill.anchor.set(0.5)
      bulletFill.position.x = currentX
      bulletFills.push(bulletFill)

      container.addChild(bulletSlot)
      container.addChild(bulletFill)

      currentX += offsetX
    }

    return {
      bulletContainer: container,
      bulletSlots: bulletSlots,
      bulletFills: bulletFills,
    }
  }

  createUsernameSprite() {
    const margin = 60

    const container = new PIXI.Container()
    container.position.y = margin
    container.scale.set(1, -1)
    container.name = "UsernameContainer"

    this.usernameText = BitmapText.create({
      label: "UsernameText",
      text: this.getUsername(),
      align: "center",
      spriteContainer: container,
      size: 22,
    })

    return container
  }

  getUsername() {
    return this.name
  }

  createHatSprite(hatName) {
    let thumbnailName = this.game.camelToSnakeCase(hatName) + ".png"
    let texture = PIXI.utils.TextureCache[thumbnailName]
    let hatSprite = new PIXI.Sprite(texture)
    hatSprite.name + "Hat"
    hatSprite.anchor.set(0.5, 0.5)
    hatSprite.scale.set(1, 1)
    hatSprite.position.x = Constants.Hats[hatName].x

    if (Constants.Hats[hatName].y) {
      hatSprite.position.y = Constants.Hats[hatName].y
    }

    return hatSprite
  }

  getDefaultWidth() {
    return Constants.playerClientWidth
  }

  getDefaultHeight() {
    return Constants.playerClientHeight
  }

  getSpritePath() {
    return "player.png"
  }

  getSpritePath() {
    return "player.png"
  }

  addSprite(x, y) {
    let container = new PIXI.Container()
    container.name = "Player"
    container.position.set(x, y)

    let rearContainer = new PIXI.Container()
    rearContainer.name = "RearContainer"
    container.addChild(rearContainer)
    container.rearContainer = rearContainer

    let scale = this.getScale()
    let armature = this.game.getPlayerArmatureFactory().buildArmatureDisplay("Armature")
    armature.scale.set(scale, -scale)
    armature.position.y = -20
    armature.alpha = 1
    container.addChild(armature)
    container.armature = armature
    this.getSpriteContainer().addChild(container)

    Interpolator.mixin(container)

    return container
  }

  getSpriteContainer() {
    if (this.isHomeCharacter()) {
      return this.game.app.stage
    } else {
      return this.game.unitsContainer
    }
  }

  createDaggerSprite() {
    let texture = PIXI.utils.TextureCache["string.png"]
    let daggerSprite = new PIXI.Sprite(texture)

    daggerSprite.anchor.set(0.5, 0)
    daggerSprite.scale.set(1, 1)
    daggerSprite.position.x = 0
    daggerSprite.position.y = 0
    daggerSprite.width = 4
    daggerSprite.height = 32
    daggerSprite.rotation = -Math.PI / 2

    daggerSprite.name = "Dagger"

    return daggerSprite
  }

  setDagger(hasDagger) {
    if (hasDagger !== this.hasDagger) {
      this.hasDagger = hasDagger
      this.equipDagger(hasDagger)
    }
  }

  equipDagger(hasDagger) {
    if (hasDagger) {
      this.forEachBodies((key, body) => {
        const dagger = this.createDaggerSprite()
        body.dagger = dagger
        body.sprite.addChild(dagger)
      })
    } else {
      this.forEachBodies((key, body) => {
        body.sprite.removeChild(body.dagger)
      })
    }
  }

  getScale() {
    return this.getDefaultWidth() / 65
  }

  isMe() {
    if (this.isHomeCharacter()) return true
    return this.id === this.game.playerId
  }

  isPlayer() {
    return true
  }

  isDead() {
    return typeof this.game.entities[this.id] === "undefined"
  }

  registerEntity() {
    super.registerEntity()

    this.game.addPlayer(this)
  }

  unregisterEntity() {
    super.unregisterEntity()

    this.game.removePlayer(this)
  }

  performAction() {}

  setTargetRotation(rotation) {
    if (this.isHomeCharacter()) return

    this.targetRotation = rotation

    if (this.equipment) {
      this.equipment.setTargetRotation(rotation)
    }
  }

  hasNoAmmo() {
    return this.ammo === 0
  }

  onPrepareAttack() {
    this.equipment.onPrepareAttack()
  }

  onAttack() {
    if (this.isHomeCharacter()) return

    if (this.equipment) {
      this.equipment.onAttack()
    }
  }

  syncWithServer(data) {
    this.instructToMove(data.position.x, data.position.y)

    this.setState(Protocol.definition().PlayerState[data.state])
    this.setIsFacingRight(data.isFacingRight)
    this.setEffects(data.effects)
    this.setAmmo(data.ammo)
    this.setArrowType(data.arrowType)
    this.setEquipType(data.equipment.equipType)
  }

  show() {
    this.forEachBodies((key, body) => {
      body.sprite.alpha = 1
    })
  }

  hide() {
    this.forEachBodies((key, body) => {
      body.sprite.alpha = 0
    })
  }

  setArrowType(arrowType) {
    if (this.arrowType !== arrowType) {
      this.arrowType = arrowType
      this.onArrowTypeChanged()
    }
  }

  setEquipType(equipType) {
    if (this.equipType !== equipType) {
      this.equipType = equipType
      this.onEquipTypeChanged()
    }
  }

  onArrowTypeChanged() {
    this.renderBulletFillColor()

    if (this.isMe()) {
      this.renderArrowTargetColor()
    }
  }

  onEquipTypeChanged() {
    if (this.equipment) {
      this.equipment.remove()
    }

    this.equipment = Equipments.forType(this.equipType).build(this)
  }

  setAmmo(ammo) {
    if (this.ammo !== ammo) {
      this.ammo = ammo
      this.renderAmmo()
    }
  }

  renderAmmo() {
    this.forEachBodies((key, body) => {
      body.bulletFills.forEach((fill) => {
        fill.alpha = 0
      })

      for (var i = 0; i < this.ammo; i++) {
        body.bulletFills[i].alpha = 1
      }
    })
  }

  getBulletFillColor() {
    let klassName = Protocol.definition().ProjectileType[this.arrowType]
    let data = Constants.Projectiles[klassName]
    if (data) {
      return ClientHelper.hexToInt(data.color) 
    } else {
      return 0xc38558
    }
  }

  renderBulletFillColor() {
    let color = this.getBulletFillColor()

    this.forEachBodies((key, body) => {
      body.bulletFills.forEach((fill) => {
        fill.tint = color
      })

      body.bulletSlots.forEach((slot) => {
        slot.tint = color
      })
    })
  }

  renderArrowTargetColor() {
    if (this.equipment) {
      let color = this.getBulletFillColor()

      this.equipment.renderArrowTargetColor(color)
    }
  }

  setIsFacingRight(isFacingRight) {
    if (this.isFacingRight !== isFacingRight) {
      this.isFacingRight = isFacingRight
      this.onIsFacingRightChanged(this.isFacingRight)
    }
  }

  setState(state) {
    if (this.state !== state) {
      let prevState = this.state
      this.state = state
      this.onStateChanged(this.state, prevState)
    }
  }

  setEffects(effects) {
    if (this.effects !== effects) {
      let prevEffects = this.effects
      this.effects = effects
      this.onEffectsChanged(prevEffects)
    }
  }

  hasEffect(effects, effect) {
    let bitIndex = Protocol.definition().EffectType[effect]
    return (effects >> bitIndex) % 2 === 1
  }

  addEffectInstance(effect) {
    let effectId = Protocol.definition().EffectType[effect]
    this.effectInstances[effect] = Effects.forType(effectId).build(this)
  }

  removeEffectInstance(effect) {
    if (this.effectInstances[effect]) {
      this.effectInstances[effect].remove()
      delete this.effectInstances[effect]
    }
  }

  onEffectsChanged(prevEffects) {
    let currEffects = this.effects

    let effectList = Object.keys(Protocol.definition().EffectType)
    effectList.forEach((effect) => {
      let isNoLongerPresent = this.hasEffect(prevEffects, effect) && !this.hasEffect(currEffects, effect)

      if (isNoLongerPresent) {
        this.removeEffectInstance(effect)
      }

      let isSuddenlyPresent = !this.hasEffect(prevEffects, effect) && this.hasEffect(currEffects, effect)

      if (isSuddenlyPresent) {
        this.addEffectInstance(effect)
      }
    })
  }

  playCustomAnimation(data) {
    if (data.id === Protocol.definition().AnimationType.Attack) {
      if (this.equipment) {
        this.equipment.animate(data)
      }
    } else if (data.id === Protocol.definition().AnimationType.Land) {
      this.playAnimation("land")
    } else if (data.id === Protocol.definition().AnimationType.WingFlap) {
      if (this.isFlying()) {
        this.effectInstance.animateWingFlap()
      }
    }
  }

  isFlying() {
    return this.effectInstance && this.effectInstance.isWing()
  }

  playAnimation(animation, prevState) {
    if (!animation) return
    animation = animation.toLowerCase()

    this.forEachBodies((key, body) => {
      if (animation === "jump") {
        body.sprite.armature.animation.gotoAndPlayByTime("jump", 0, 1)
      } else if (animation === "doublejump") {
        body.sprite.armature.animation.play("spin")
      } else if (animation === "roll") {
        body.sprite.armature.animation.play("spin")
      } else if (animation === "fall") {
        body.sprite.armature.animation.gotoAndPlayByTime("jump", 0, 1)
      } else if (animation === "land") {
        body.sprite.armature.animation.gotoAndPlayByTime("stand", 0, 1)
      } else if (animation === "die") {
        body.sprite.armature.animation.gotoAndPlayByTime("die", 0, 1)
        this.game.screenShake()
      } else if (animation === "crouch") {
        body.sprite.armature.animation.gotoAndPlayByTime("crouch", 0, 1)
      } else if (prevState === "Crouch") {
        body.sprite.armature.animation.gotoAndPlayByTime("stand", 0, 1)
        if (animation === "run") {
          setTimeout(() => {
            body.sprite.armature.animation.play(animation)
          }, 100)
        }
      } else {
        body.sprite.armature.animation.play(animation)
      }
    })
  }

  gotoAndStopByFrame(animation, frame) {
    this.forEachBodies((key, body) => {
      body.sprite.armature.armature.animation.gotoAndStopByFrame(animation,frame)
    })
  }

  aim() {
    this.forEachBodies((key, body) => {
      body.aimAnimation = body.sprite.armature.animation.gotoAndStopByProgress("shoot", 0)
    })
  }

  onStateChanged(state, prevState) {
    this.playAnimation(state, prevState)

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
    }

    if (state === "Die") {
      this.hideTimeout = setTimeout(() => {
        this.hide()
      }, 1000)
    } else if (prevState === "Die") {
      this.show()
    }
  }

  onIsFacingRightChanged(isFacingRight) {
    if (isFacingRight) {
      this.forEachBodies((key, body) => {
        body.sprite.armature.scale.set(this.getScale(), -this.getScale())
        // body.sprite.armature.position.x = 16
        if (this.hasDagger) {
          body.dagger.rotation = -Math.PI / 2
        }
      })
    } else {
      this.forEachBodies((key, body) => {
        body.sprite.armature.scale.set(-this.getScale(), -this.getScale())
        // body.sprite.armature.position.x = -16
        if (this.hasDagger) {
          body.dagger.rotation = Math.PI / 2
        }
      })
    }
  }
}

module.exports = Player
