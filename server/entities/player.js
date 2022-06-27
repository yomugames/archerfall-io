const Helper = require("../../common/helper")
const SocketUtil = require("../util/socket_util")
const Protocol = require("../../common/util/protocol")
const BaseEntity = require("./base_entity")
const Constants = require("../../common/constants.json")
const Projectiles = require("./projectiles/index")
const BadWordsFilter = require("../util/bad_words_filter")
const xss = require("xss")
const Equipments = require("./equipments/index")

const ALLOW_FALL_TRHOUGH_FRAMES = 3

class Player extends BaseEntity {
  constructor(socket, data) {
    super(data.game, data)

    this.socket = socket

    if (socket) {
      this.sessionId = socket.sessionId
      this.remoteAddress = Helper.getSocketRemoteAddress(socket)
    }

    this.locale = data.locale || "en"
    this.resumeTime = Date.now()
    this.speed = 20
    this.name = data.username
    this.state = Protocol.definition().PlayerState.Idle
    this.isFacingRight = true
    this.isPlanningToMove = false
    this.effects = 0
    this.effectTimestamps = {}
    this.ammo = this.MAX_AMMO = 4
    this.fireRate = 4
    this.targetRotation = 0
    this.lastChatTimestamp = 0
    this.lastRollTimestamp = 0
    this.jumpCount = 0
    this.uid = data.uid

    this.fallThroughBlock = null
    this.isGrounded = false
    this.wantsToFallThrough = false
    this.jumpTimestamp = 0
    this.lastControlKeys = 0
    this.END_ROUND_STOP_BUFFER = 1000 + Math.floor(Math.random() * 2500)
    this.assignHat(data.hat)
    this.assignColor(data.color)
    this.setArrowType(Protocol.definition().ProjectileType.Arrow)

    if (data.hasOwnProperty("x") && data.hasOwnProperty("y")) {
      this.setPosition(data.x, data.y)
    }
  }

  assignHat(hat) {
    this.hat = hat
  }

  assignColor(color) {
    this.color = color
  }

  setIsHost(isHost) {
    this.isHost = isHost
  }

  setEquip(equipType) {
    this.equipment = Equipments.forType(equipType).build(this)
  }

  onAddedToGame() {
    this.touchActivity()
  }

  onAddedToStage() {
    this.setEquip(Protocol.definition().EquipmentType.Bow)
  }

  getName() {
    return this.name
  }

  getDefaultWidth() {
    return Constants.playerWidth
  }

  getDefaultHeight() {
    return Constants.playerHeight
  }

  getSocketId() {
    return this.socket.id
  }

  touchActivity() {
    this.lastActivityTimestamp = this.game.timestamp
  }

  isLoggedIn() {
    return !!this.uid
  }

  getUid() {
    return this.uid
  }

  replaceBadWords(message) {
    message = BadWordsFilter.replaceBadWordsEnglish(message)

    return message
  }

  sanitize(text) {
    text = xss(text)
    return text.replace(/(<([^>]+)>)/gi, "")
  }

  chat(data) {
    let message = data.message
    message = this.sanitize(message)
    if (message.length === 0) return

    let maxChatLength = 100
    message = message.substring(0, maxChatLength)
    message = this.replaceBadWords(message)

    let isSameMessage = this.lastMessage === message
    let isSlowMode = false // !this.isLoggedIn() || isSameMessage
    if (isSlowMode && Date.now() - this.lastChatTimestamp < 2000) {
      SocketUtil.emit(this.socket, "ServerChat", { message: "%error%Please wait 2 seconds" })
      return
    }

    this.lastChatTimestamp = Date.now()
    // reset other players chat timer, to allow them to reply immediately
    this.game.forEachPlayer((player) => {
      if (player !== this) {
        player.lastChatTimestamp = 0
      }
    })

    this.lastMessage = message

    let serverChatOptions = {
      playerId: this.getId(),
      message: message,
      username: this.name,
    }

    if (this.isLoggedIn()) {
      serverChatOptions.uid = this.getUid()
    }

    this.game.broadcastEvent("ServerChat", serverChatOptions)
  }

  isAFKTimeLimitExceeded() {
    if (debugMode) return false
    if (this.game.isLevelEditor) return false
    return this.game.timestamp - this.lastActivityTimestamp > Constants.physicsTimeStep * 60
  }

  resetDisconnection() {
    this.disconnection = 0
    this.resumeTime = Date.now()
  }

  increaseDisconnection() {
    this.disconnection = this.disconnection || 0
    this.disconnection += 1
  }

  getSessionId() {
    return this.sessionId
  }

  getSessionDuration() {
    return Math.floor((Date.now() - this.resumeTime) / 1000)
  }

  updateInput(data) {
    if (!this.game) return
    if (!this.stage) return

    if (this.hasFinishedRound) return
    if (this.game.isLevelEditor && !this.stage.shouldEditorSimulate) {
      return
    }
    if (this.isDead) return

    if (data.hasOwnProperty("controlKeys")) {
      this.isDesktopControl = true
      this.desktopControls(data)
    } else {
      this.mobileControls(data)
    }

    if (data.jump && this.canJump()) {
      this.jump()
    } else if (data.roll && this.canRoll()) {
      this.roll()
    }
  }

  canRoll() {
    if (!this.isGrounded) return false

    if (this.state === Protocol.definition().PlayerState.Roll) return false

    return true
    // let durationSinceLastRoll = this.game.timestamp - this.lastRollTimestamp
    // return durationSinceLastRoll > (Constants.physicsTimeStep * 3)
  }

  roll() {
    this.lastRollTimestamp = this.game.timestamp

    this.setState(Protocol.definition().PlayerState.Roll)

    let velocity = this.getLinearVelocity()
    if (this.isFacingRight) {
      this.setLinearVelocity(45, velocity.y)
    } else {
      this.setLinearVelocity(-45, velocity.y)
    }
  }

  canJump() {
    if (this.isFlying()) {
      return true
    }

    if (this.isGrounded) return true

    return this.jumpCount < 2
  }

  updateTarget(data) {
    if (isNaN(data.rotation)) return
    this.touchActivity()
    this.targetRotation = data.rotation
  }

  setState(state) {
    let prevState = this.state
    if (this.state !== state) {
      this.state = state
      this.onStateChanged(state, prevState)
    }
  }

  onLandedPlatform(obstacle) {
    this.setFallThroughBlock(null)

    if (obstacle.isJumpPad()) {
      if (this.canJump()) {
        this.jump(100)
        this.stage.broadcastEvent("PlayAnimation", {
          entityId: obstacle.getId(),
        })
      }
    }
  }

  onHitEntity(obstacle) {
    if (obstacle && this.isFeetOnPlatform()) {
      if (!this.isGrounded) {
        this.handleLand(obstacle)
      }
    }
  }

  handleLand(obstacle) {
    this.jumpCount = 0
    this.isGrounded = true
    this.onLandedPlatform(obstacle)

    if (this.isDesktopControl) {
      this.desktopControls({ controlKeys: this.lastControlKeys })
    } else {
      this.mobileControls(this.lastMobileControls)
    }
  }

  handleRollFinished() {
    this.attemptNotMove()
    this.setState(Protocol.definition().PlayerState.Idle)

    if (this.isDesktopControl) {
      this.desktopControls({ controlKeys: this.lastControlKeys })
    } else {
      this.mobileControls(this.lastMobileControls)
    }
  }

  handleShootFinished() {
    this.attemptNotMove()
    this.setState(Protocol.definition().PlayerState.Idle)

    if (this.isDesktopControl) {
      this.desktopControls({ controlKeys: this.lastControlKeys })
    } else {
      this.mobileControls(this.lastMobileControls)
    }
  }

  getFeetY() {
    return this.getY() - this.getHeight() / 2
  }

  isFeetOnPlatform() {
    let offset = 4
    let x = this.getX()
    let y = this.getFeetY() - offset

    let leftFootHit = this.stage.groundMap.hitTest(x - this.getWidth() / 2 + offset, y)
    if (leftFootHit.entity) return true

    let middleFootHit = this.stage.groundMap.hitTest(x, y)
    if (middleFootHit.entity) return true

    let rightFootHit = this.stage.groundMap.hitTest(x + this.getWidth() / 2 - offset, y)
    if (rightFootHit.entity) return true

    return false
  }

  hasAmmo() {
    return this.ammo > 0
  }

  reduceAmmo() {
    this.ammo -= 1
    if (this.ammo <= 0) {
      this.ammo = 0
      this.reloadTimestamp = this.game.timestamp + Constants.physicsTimeStep * 2

      this.setArrowType(Protocol.definition().ProjectileType.Arrow)
    }
  }

  setArrowType(arrowType) {
    if (this.arrowType !== arrowType) {
      this.arrowType = arrowType
    }
  }

  reloadAmmo() {
    this.ammo = this.MAX_AMMO
    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.Reload })
  }

  attack() {
    this.equipment.use()
  }

  applyGravity(gravity) {
    // if (this.game.isLevelEditor) return

    if (this.velocity.y <= 0) {
      super.applyGravity({ x: 0, y: gravity.y * 1 })
    } else {
      super.applyGravity(gravity)
    }
  }

  moveForward() {
    if (this.hasFinishedRound) return
    if (this.cantMove) return
    if (this.isRolling()) return

    if (this.isGrounded) {
      this.setState(Protocol.definition().PlayerState.Run)
    }
    let velocity = this.getLinearVelocity()
    this.setLinearVelocity(this.getSpeed(), velocity.y)

    this.setNormalHeightAndPosition()
  }

  moveBackward() {
    if (this.hasFinishedRound) return
    if (this.cantMove) return
    if (this.isRolling()) return

    if (this.isGrounded) {
      this.setState(Protocol.definition().PlayerState.Run)
    }

    let velocity = this.getLinearVelocity()
    this.setLinearVelocity(-this.getSpeed(), velocity.y)
    this.setNormalHeightAndPosition()
  }

  getSpeed() {
    if (this.hasEffect("Haste")) {
      return this.speed + 10
    } else if (this.hasEffect("Fire")) {
      return this.speed - 5
    } else {
      return this.speed
    }
  }

  mobileControls(data) {
    if (!data) return
    if (this.isDead) return

    if (data.attack) {
      this.attack()
      return
    }

    if (data.idle) {
      this.isPlanningToMove = false
      this.setNormalHeightAndPosition()
      this.setState(Protocol.definition().PlayerState.Idle)

    } else if (data.direction === Protocol.definition().DirectionType.Right) {
      this.isFacingRight = true
      this.isPlanningToMove = true
    } else if (data.direction === Protocol.definition().DirectionType.Left) {
      this.isFacingRight = false
      this.isPlanningToMove = true
    } else {
      if (this.isGrounded) {
        this.setState(Protocol.definition().PlayerState.Idle)
        if (data.direction === Protocol.definition().DirectionType.Down) {
          this.setWantsToFallThrough(true)
        }
      }
    }

    this.lastMobileControls = data
  }

  attemptNotMove() {
    this.isPlanningToMove = false
  }

  setWantsToFallThrough(wantsToFallThrough) {
    this.wantsToFallThrough = wantsToFallThrough
  }

  desktopControls(data) {
    if (this.isDead) return

    // this.crouch()
    // this.isPlanningToMove = false;
    // this.setLinearVelocity(0, 0)
    if (data.controlKeys & Constants.Control.right) {
      this.isFacingRight = true
      this.isPlanningToMove = true
    } else if (data.controlKeys & Constants.Control.left) {
      this.isFacingRight = false
      this.isPlanningToMove = true
    } else {
      this.setNormalHeightAndPosition()
      this.isPlanningToMove = false

      if (this.isGrounded) {
        this.setState(Protocol.definition().PlayerState.Idle)

        if (data.controlKeys & Constants.Control.down) {
          this.setWantsToFallThrough(true)
        }
      }
    }

    if (data.attack) {
      this.attack()
    }

    this.lastControlKeys = data.controlKeys
  }

  crouch() {
    this.setState(Protocol.definition().PlayerState.Crouch)

    this.setCrouchHeightAndPosition()
  }

  setCrouchHeightAndPosition() {
    if (this.height === Constants.playerHeight) {
      this.position.y -= Constants.tileSize / 2
      this.height = Constants.playerHeight / 2
    }
  }

  setNormalHeightAndPosition() {
    if (this.height === Constants.playerHeight / 2) {
      this.position.y += Constants.tileSize / 2
      this.height = Constants.playerHeight
    }
  }

  getLinearVelocity() {
    return this.velocity
  }

  getFallThroughBlock() {
    return this.fallThroughBlock
  }

  setFallThroughBlock(fallThroughBlock) {
    this.fallThroughBlock = fallThroughBlock
  }

  isPlayer() {
    return true
  }

  isBot() {
    return false
  }

  removeFromGame() {
    if (this.game) {
      this.game.removePlayer(this)
    }
  }

  remove() {
    super.remove()

    this.removeFromGame()

    if (this.stage) {
      this.stage.onPlayerUpdated(this)
    }
  }

  jump(power = 80) {
    if (!this.canJump()) return
    if (this.isDead) return

    this.setWantsToFallThrough(false)
    this.isGrounded = false
    this.jumpCount += 1

    this.velocity.y = power

    this.setNormalHeightAndPosition()

    if (this.isFlying()) {
      this.setState(Protocol.definition().PlayerState.Jump)

      this.stage.broadcastEvent("PlayAnimation", {
        id: Protocol.definition().AnimationType.WingFlap,
        entityId: this.getId(),
      })
    } else {
      if (this.jumpCount > 1) {
        this.setState(Protocol.definition().PlayerState.DoubleJump)
      } else {
        this.setState(Protocol.definition().PlayerState.Jump)
      }
    }
  }

  isConnected() {
    return !this.getSocket().isClosed
  }

  getSocket() {
    return this.socket
  }

  getGroupIndex() {
    return -1
  }

  editLevel(data) {
    if (!this.game.isLevelEditor) return

    this.game.stage.editLevel(data)
  }

  build(data) {
    if (!this.game.isLevelEditor) return
    if (!this.stage) return

    if (data.type === 0) {
      // eraser
      let row = Math.floor(data.y / Constants.tileSize)
      let col = Math.floor(data.x / Constants.tileSize)
      this.stage.removeBuild(row, col)
      return
    }

    // if (this.stage.isOccupied(data.x, data.y, data.w, data.h)) {
    let box = this.coordToBox(data.x, data.y, data.w, data.h)
    this.stage.removeBuildByBox(box)
    // }

    this.stage.build(data.type, data)
  }

  coordToBox(x, y, w, h) {
    let box = {
      pos: {
        x: x - w / 2,
        y: y + h / 2,
      },
      w: w,
      h: h,
    }

    return box
  }

  closeSocket() {
    if (this.isConnected()) {
      this.getSocket().close()
    }
  }

  onStateChanged(currState, prevState) {
    if (prevState === Protocol.definition().PlayerState.Roll) {
      // decrease speed
      this.velocity.x = 0
    }
  }

  getStateName() {
    return Protocol.definition().PlayerState[this.state]
  }

  determineFallState() {
    if (this.velocity.y < 0 && !this.isFeetOnPlatform() && !this.isDead) {
      this.setState(Protocol.definition().PlayerState.Fall)
      this.isGrounded = false
    }
  }

  removeEffectsAfterDuration() {
    let ghostDuration = this.game.timestamp - this.effectTimestamps["Ghost"]
    if (ghostDuration > Constants.physicsTimeStep * 2) {
      this.removeEffect("Ghost")
    }
  }

  isUntargetable() {
    return this.hasEffect("Ghost")
  }

  isRolling() {
    return this.state === Protocol.definition().PlayerState.Roll
  }

  handleTestBotPerfTest() {
    if (this.getName().match("@bot_")) {
      this.attack()
    }
  }

  executeTurn() {
    if (this.isAFKTimeLimitExceeded()) {
      SocketUtil.emit(this.getSocket(), "AFK", {})
      this.closeSocket()
      this.remove()
      return
    }

    super.executeTurn()

    if (this.isRolling()) {
      let rollFrameDuration = 4
      let durationSinceLastRoll = this.game.timestamp - this.lastRollTimestamp
      if (durationSinceLastRoll >= rollFrameDuration) {
        this.handleRollFinished()
      }
    }

    if (this.isGrounded) {
      this.determineFallState()
    }

    this.removeEffectsAfterDuration()
    this.executeEffects()

    this.handleTestBotPerfTest()

    if (this.isDead) {
      if (this.game.timestamp > this.resurrectTimestamp) {
        this.resurrect()
      }

      return
    }

    if (this.cantMove) {
      if (this.game.timestamp > this.canMoveTimestamp) {
        this.cantMove = false
      }
    }

    if (this.isPlanningToMove) {
      if (this.isFacingRight) {
        this.moveForward()
      } else {
        this.moveBackward()
      }
    } else {
      this.decelerateHorizontalSpeed()
    }

    if (!this.hasAmmo()) {
      if (this.game.timestamp > this.reloadTimestamp) {
        this.reloadAmmo()
      }
    }
  }

  executeEffects() {
    if (this.hasEffect("Fire")) {
      let fireDuration = this.game.timestamp - this.effectTimestamps["Fire"]
      if (fireDuration >= Constants.physicsTimeStep) {
        this.removeEffect("Fire")
        this.die()
      }
    }

    if (this.hasEffect("RotatingDart")) {
      const hitUnit = this.getFirstUnitHitByRotatingDart()
      if (hitUnit) {
        hitUnit.die()
        this.removeEffect("RotatingDart")
      }
    }
  }

  setCantMove(cantMove) {
    this.cantMove = cantMove
  }

  allowMoveAfterTimestamp(amount) {
    this.canMoveTimestamp = this.game.timestamp + amount
  }

  getFirstUnitHitByRotatingDart() {
    const playerBox = this.getBox()
    const width = Constants.Pickups.RotatingDart.radius * 2 + Math.abs(this.velocity.x)
    const height = Constants.Pickups.RotatingDart.radius * 2 + Math.abs(this.velocity.y)

    return this.stage.getFirstUnitCollidingWithBox(
      { pos: { x: playerBox.pos.x - width / 2, y: playerBox.pos.y + height / 2 }, w: width, h: height },
      [this]
    )
  }

  onPositionChanged(options = {}) {
    this.touchActivity()
    super.onPositionChanged()
    this.detectPickups()

    if (options.isGridPositionChanged) {
      this.onGridPositionChanged()
    }
  }

  detectLavaCollision() {
    if (!this.isAlive()) return

    let data = this.getUpperBodyRowCol()
    let upperTile = this.stage.groundMap.get(data.row, data.col)
    data = this.getLowerBodyRowCol()
    let lowerTile = this.stage.groundMap.get(data.row, data.col)

    if ((upperTile && upperTile.isLava()) || (lowerTile && lowerTile.isLava())) {
      this.addFire()
      this.jump(40)
    }
  }

  getLastX() {
    return this.lastX
  }

  getLastY() {
    return this.lastY
  }

  onGridPositionChanged() {
    this.detectLavaCollision()
  }

  detectPickups() {
    let rowColList = this.getRectBoundsRowCol()
    rowColList.forEach((data) => {
      this.checkPickupForRowCol(data.row, data.col)
    })
  }

  checkPickupForRowCol(row, col) {
    let hit = this.stage.pickupMap.rowColHitTest(row, col)
    if (hit.entity) {
      this.onPickupCollide(hit.entity)
    }
  }

  getRectBoundsRowCol() {
    let quarterHeight = this.getHeight() / 4
    let halfWidth = this.getWidth() / 2

    let upperLeft = {
      row: Math.floor((this.getY() + quarterHeight) / Constants.tileSize),
      col: Math.floor((this.getX() - halfWidth) / Constants.tileSize),
    }

    let upperRight = {
      row: Math.floor((this.getY() + quarterHeight) / Constants.tileSize),
      col: Math.floor((this.getX() + halfWidth) / Constants.tileSize),
    }

    let lowerLeft = {
      row: Math.floor((this.getY() - quarterHeight) / Constants.tileSize),
      col: Math.floor((this.getX() - halfWidth) / Constants.tileSize),
    }

    let lowerRight = {
      row: Math.floor((this.getY() - quarterHeight) / Constants.tileSize),
      col: Math.floor((this.getX() + halfWidth) / Constants.tileSize),
    }

    return [upperLeft, upperRight, lowerLeft, lowerRight]
  }

  getUpperBodyRowCol() {
    let quarterHeight = this.getHeight() / 4
    return {
      row: Math.floor((this.getY() + quarterHeight) / Constants.tileSize),
      col: this.getCol(),
    }
  }

  getLowerBodyRowCol() {
    let quarterHeight = this.getHeight() / 4
    return {
      row: Math.floor((this.getY() - quarterHeight) / Constants.tileSize),
      col: this.getCol(),
    }
  }

  onPickupCollide(pickup) {
    this.removeEffect("Ghost")

    pickup.apply(this)
    pickup.remove()
  }

  onProjectileHit(projectile) {
    if (this.hasShield()) {
      this.removeShield()
      return
    }

    this.knockbackFromProjectile()

    this.die(projectile.shooter)
  }

  knockbackFromProjectile() {
    this.velocity.x = Math.sign(this.velocity.x) * 16

    if (this.velocity.x > 0) {
      this.isFacingRight = false
    } else {
      this.isFacingRight = true
    }
  }


  onMobHit(mob) {
    if (this.hasShield()) {
      this.removeShield()
      return
    }

    this.die()
  }

  hasShield() {
    return this.hasEffect("Shield")
  }

  isFlying() {
    return this.hasEffect("Wing")
  }

  isInvisible() {
    return this.hasEffect("Invisible")
  }

  addFire() {
    this.addEffect("Fire")
  }

  addWing() {
    this.addEffect("Wing")
  }

  addShield() {
    this.addEffect("Shield")
  }

  addRotatingDart() {
    this.addEffect("RotatingDart")
  }

  addGhost() {
    this.addEffect("Ghost")
  }

  addHaste() {
    this.addEffect("Haste")
  }

  addInvisible() {
    this.addEffect("Invisible")
  }

  addDoubleShot() {
    this.addEffect("DoubleShot")
  }

  removeInvisible() {
    this.removeEffect("Invisible")
  }

  removeShield() {
    this.removeEffect("Shield")
  }

  removeHaste() {
    this.removeEffect("Haste")
  }

  hasEffect(effect) {
    let bitIndex = this.getBitIndex(effect)
    return (this.effects >> bitIndex) % 2 === 1
  }

  addEffect(effect) {
    if (this.hasEffect(effect)) return
    let bitIndex = this.getBitIndex(effect)

    // or operation against bit index with 1 while rest is 0
    let enableMask = 1 << bitIndex

    this.effects |= enableMask

    this.effectTimestamps[effect] = this.game.timestamp
  }

  removeEffect(effect) {
    let bitIndex = this.getBitIndex(effect)

    // and operation against bit index with 0 while rest is 1
    let disableMask = ~(1 << bitIndex)

    this.effects &= disableMask

    delete this.effectTimestamps[effect]
  }

  clearAllEffects() {
    this.effects = 0
  }

  getBitIndex(effect) {
    return Protocol.definition().EffectType[effect]
  }

  isUnit() {
    return true
  }

  isAlive() {
    return !this.isDead
  }

  die(killer) {
    if (this.isDead) return
    if (this.game.isLevelEditor) return

    this.setNormalHeightAndPosition()
    this.isDead = true
    this.cantMove = true

    if (this.canResurrect()) {
      this.resurrectTimestamp = this.game.timestamp + Constants.physicsTimeStep * 3
    }

    this.canMoveTimestamp = this.resurrectTimestamp
    this.setState(Protocol.definition().PlayerState.Die)

    this.clearAllEffects()

    this.stage.broadcastEvent("PlaySound", { id: Protocol.definition().SoundType.ArrowHit })
    this.stage.onPlayerDie(this, killer)
  }

  canResurrect() {
    return false
  }

  resurrect(options = {}) {
    if (!options.forced) {
      if (!this.stage.isRoundStarted) return
    }

    this.touchActivity()

    this.isDead = false
    this.cantMove = false
    this.fallThroughBlock = null
    this.setState(Protocol.definition().PlayerState.Idle)
    this.clearAllEffects()
    this.setLinearVelocity(0, 0)
    this.setArrowType(Protocol.definition().ProjectileType.Arrow)
    this.setEquip(Protocol.definition().EquipmentType.Bow)
    this.lastControlKeys = 0
    this.lastMobileControls = null
    this.isPlanningToMove = false
    this.reloadAmmo()
  }
}

module.exports = Player
