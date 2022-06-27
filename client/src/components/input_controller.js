const SocketUtil = require("../util/socket_util")
const Constants = require('../../../common/constants.json')
const Nipplejs = require('nipplejs')
const Joystick = require("./pixi-virtual-joystick")


class InputController {
  constructor(game) {
    this.game = game

    this.initConstants()
    this.initVariables()
    this.initListeners()

    this.pending_inputs = []

  }

  setPlayer(player) {
    this.player = player
    this.player.inputController = this
  }

  initMobileControls() {
    if (!this.game.main.isMobile) return

    this.initMoveJoystick()
    this.initAttackJoystick()
    this.initActionButtons()
  }

  initMoveJoystick() {
    const outerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["joystick_base_big.png"])
    outerSprite.name = "Outer"

    const innerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["joystick_handle_simple.png"]) 
    innerSprite.name = "Inner"

    this.moveJoystick = new Joystick({
      outer: outerSprite, 
      inner: innerSprite, 
    
      outerScale: { x: 1, y: 1 },
      innerScale: { x: 0.3, y: 0.3 },
    
      onChange: (data) => {
        if (data.power < 0.2) return

        if (data.direction.match("left")) {
          this.idle = false
          this.moveDirection = "left"
        } else if (data.direction.match("right")) {
          this.idle = false
          this.moveDirection = "right"
        } else if (data.direction.match("bottom")) {
          this.idle = false
          this.moveDirection = "down"
        }
      },
    
      onStart: () => {
      },
    
      onEnd: () => {
        console.log('end')
        this.idle = true
        this.moveDirection = null
      },
    })
    
    this.moveJoystick.name = "MoveJoystick"
    this.moveJoystick.scale.y = -1
    this.moveJoystick.position.x = 250
    this.moveJoystick.position.y = 250
    this.game.app.stage.addChild(this.moveJoystick)
  }
  
  initAttackJoystick() {
    const outerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["joystick_base_simple.png"])
    outerSprite.name = "Outer"

    const innerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["crosshair.png"]) 
    innerSprite.name = "Inner"

    this.attackJoystick = new Joystick({
      outer: outerSprite, 
      inner: innerSprite,
    
      outerScale: { x: 1, y: 1 },
      innerScale: { x: 0.5, y: 0.5 },
    
      onChange: (data) => {
        this.shootRotation = data.angle * Math.PI / 180

        this.player.onPrepareAttack()
        this.player.setTargetRotation(this.shootRotation)
      },
    
      onStart: () => {
      },
    
      onEnd: (data) => {
        this.performShoot()
        console.log('end')
      },
    })
    
    this.attackJoystick.name = "AttackJoystick"
    this.attackJoystick.scale.y = -1
    this.attackJoystick.position.x = this.game.getCameraWidth() - 120
    this.attackJoystick.position.y = 250
    this.game.app.stage.addChild(this.attackJoystick)
  }

  initActionButtons() {
    this.createJumpButton()
  }

  createJumpButton() {
    let button = new PIXI.Container()
    button.name = "JumpButton"
    this.jumpButton = button

    let outerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["joystick_base_simple.png"])
    outerSprite.name = "JumpInner"


    let innerSprite = new PIXI.Sprite(PIXI.utils.TextureCache["jump_button.png"])
    innerSprite.name = "JumpInner"
    innerSprite.alpha = 0.7

    this.jumpButtonInnerSprite = innerSprite
    this.jumpButton.addChild(outerSprite)
    this.jumpButton.addChild(innerSprite)

    this.jumpButton.interactive = true
    this.jumpButton.position.x = this.game.getCameraWidth() - 50
    this.jumpButton.position.y = 450
    this.jumpButton.scale.y = -1
    this.jumpButton.width = 120
    this.jumpButton.height = -120
    this.jumpButton.on("pointerdown", this.onJumpButtonDown.bind(this))
    this.jumpButton.on("pointerup", this.onJumpButtonUp.bind(this))

    this.game.app.stage.addChild(this.jumpButton)

  }

  onJumpButtonDown() {
    this.jumpButtonInnerSprite.alpha = 1
    this.game.sendJumpAction()
  }

  onJumpButtonUp() {
    this.jumpButtonInnerSprite.alpha = 0.7
  }

  onMoveJoystickMove(e, data) {
    let distanceThreshold = 16
    if (data.distance < distanceThreshold) return
    if (!data.direction) return
    this.idle = false

    this.moveDirection = data.direction.x
  }

  onMoveJoystickEnd(e, data) {
    this.idle = true
    this.moveDirection = null
  }

  performShoot() {
    SocketUtil.emit("PlayerTarget", { rotation: this.shootRotation })      

    let options = {
      attack: true,
      idle: this.idle
    }

    if (this.moveDirection) {
      options.direction = this.game.getProtocolDirection(this.moveDirection)
    }

    this.game.sendPlayerInput(options)

    this.player.onAttack()
  }


  initConstants() {
    this.KEY_EVENT_TYPES = {
      down: 0,
      up: 1
    }

    this.keyToControlMap = {
      37: Constants.Control.left,
      38: Constants.Control.up,
      39: Constants.Control.right,
      40: Constants.Control.down,
      65: Constants.Control.left,   // 'A'
      83: Constants.Control.down,   // 'S'
      68: Constants.Control.right,  // 'D'
      87: Constants.Control.up,     // 'W'
    }

  }

  initVariables() {
    this.canvas = document.getElementById("game_canvas")
    this.controlKeys = 0
    this.idle = true
  }

  isControlPressed(control) {
    let nthBit = this.getBaseLog(2, control)
    return (this.controlKeys >> nthBit) % 2 === 1
  }

  isAimPressed(control) {
    let nthBit = this.getBaseLog(2, control)
    return (this.aimKeys >> nthBit) % 2 === 1
  }

  getBaseLog(x, y) {
    return Math.log(y) / Math.log(x)
  }

  initListeners() {
    this.keyDownHandler   = this.globalKeyDownHandler.bind(this)
    this.keyUpHandler     = this.globalKeyUpHandler.bind(this)
    this.mouseDownHandler = this.globalMouseDownHandler.bind(this)
    this.mouseUpHandler   = this.globalMouseUpHandler.bind(this)
    this.mouseMoveHandler = this.globalMouseMoveHandler.bind(this)
    this.canvasBlurHandler = this.onCanvasBlur.bind(this)

    document.querySelector("#game_canvas").addEventListener("blur", this.canvasBlurHandler, true)
    document.addEventListener("keydown", this.keyDownHandler, true)
    document.addEventListener("keyup", this.keyUpHandler, true)
    document.addEventListener("mousedown", this.mouseDownHandler, true)
    document.addEventListener("mouseup", this.mouseUpHandler, true)
    document.addEventListener("touchstart", this.mouseDownHandler, true)
    document.addEventListener("touchend", this.mouseUpHandler, true)
    document.addEventListener("mousemove", this.mouseMoveHandler, true)
  }

  removeListeners() {
    document.querySelector("#game_canvas").removeEventListener("blur", this.canvasBlurHandler, true)

    document.removeEventListener("keydown", this.keyDownHandler, true)
    document.removeEventListener("keyup", this.keyUpHandler, true)
    document.removeEventListener("mousedown", this.mouseDownHandler, true)
    document.removeEventListener("mouseup", this.mouseUpHandler, true)
    document.removeEventListener("touchstart", this.mouseDownHandler, true)
    document.removeEventListener("touchend", this.mouseUpHandler, true)
    document.removeEventListener("mousemove", this.mouseMoveHandler, true)
  }

  onCanvasBlur() {
    this.controlKeys = 0 // reset control keys
  }

  globalKeyUpHandler(e) {
    if (e.target.tagName.toLowerCase() === "input") return

    const control = this.keyToControlMap[e.keyCode]

    if (control) {
      if (this.isControlPressed(control)) {
        this.controlKeys ^= control
      }

      if (this.isAimPressed(control)) {
        this.aimKeys ^= control
        this.onAimKeysChanged()
      }
    } else if (e.keyCode === 49) { // 1
      this.game.enterEraseMode()
    } else if (e.keyCode === 13) { // enter
      this.game.chatMenu.open()
    } else if (e.keyCode === 74) { // j
      this.isKeyboardAimMode = false
      this.releaseShoot()
    } else if (e.keyCode === 192) {  // backquote
      if (debugMode) {
        this.game.initLevelEditor({})
      }
    } else if (e.keyCode === 116) {  // f5
      this.game.togglePerformanceDebug()
    } else if (e.keyCode === 27) {  // esc
      if (this.game.isLevelEditor) {
        this.game.selectNoBuild()
        this.game.exitBuildMode()
      }
    }
  }

  equipPlayer(e) {
    const mousePos = this.game.app.renderer.plugins.interaction.mouse.global

    const keyCodeDiff = 48
    let inventoryKey

    if (e.keyCode <= 57) {
      inventoryKey = e.keyCode - keyCodeDiff
    } else {
      inventoryKey = String.fromCharCode(e.which).toLowerCase()
    }

    const buildingKlass = this.game.buildingTable[inventoryKey]
    if (buildingKlass) {
      buildingKlass.equipToPlayer(player, mousePos)
    }
  }

  onAimKeysChanged() {
    // if (this.aimKeys) {
    //   this.player.setTargetRotation(this.getAimRotation())
    // }
  }

  globalKeyDownHandler(e) {
    if (e.target.tagName.toLowerCase() === "input") return

    const control = this.keyToControlMap[e.keyCode]
    if (control) {
      this.aimKeys |= control
      this.onAimKeysChanged()

      this.controlKeys |= control
    } 

    if (!e.repeat) {
      if ((e.keyCode === 87 || e.keyCode === 32)) {  // space or up
        this.game.sendJumpAction()
      } else if (e.keyCode === 16 || e.keyCode === 75) { // shift or k
        this.game.sendRollAction()
      } else if (e.keyCode === 74) { // j
        this.isKeyboardAimMode = true
        this.player.onPrepareAttack()
      }
    } 
  }

  isDirectionHeld() {
    const leftHeld  = this.controlKeys & Constants.Control.left
    const rightHeld = this.controlKeys & Constants.Control.right
    const upHeld    = this.controlKeys & Constants.Control.up
    const downHeld  = this.controlKeys & Constants.Control.down

    return leftHeld || rightHeld || upHeld || downHeld
  }

  getAimRotation() {
    const leftHeld  = this.aimKeys & Constants.Control.left
    const rightHeld = this.aimKeys & Constants.Control.right
    const upHeld    = this.aimKeys & Constants.Control.up
    const downHeld  = this.aimKeys & Constants.Control.down

    const direction = { 
      x: Math.sign(rightHeld - leftHeld),
      y: Math.sign(upHeld  - downHeld),
    }

    return Math.atan2(direction.y, direction.x)
  }

  globalMouseUpHandler(e) {
    if (e.target.closest(".in_game_btn")) return // menu clicked

    this.releaseShoot()
  }

  releaseShoot() {
    this.controlKeys &= ~Constants.Control.enter
  
    if (this.isMobile()) return

    SocketUtil.emit("PlayerTarget", { rotation: this.player.targetRotation })      

    let options = {
      attack: true,
      idle: this.idle,
      controlKeys: this.controlKeys
    }

    this.game.sendPlayerInput(options)

    this.player.onAttack()
  }

  globalMouseDownHandler(e) {
    if (this.game.isHomePage()) return
    if (this.game.isBuildMode()) {
      if (e.target.id !== 'game_canvas') return
    }
  
    this.controlKeys |= Constants.Control.enter    

    if (this.isMobile()) return
    if (e.target.closest(".in_game_btn")) return // menu clicked

    if (this.game.isLevelEditor) {
      if (this.game.simulate) {
        this.player.onPrepareAttack()
      }
    } else {
      this.player.onPrepareAttack()
    }
  }

  isMobile() {
    return this.game.main.isMobile
  }

  getMouseBottomLeftDomPosition(mouseX, mouseY) {
    return {
      x: mouseX,
      y: window.innerHeight - mouseY
    }
  }

  getPlayerBottomLeftDomPosition() {
    let canvasXOffset = game_canvas.getBoundingClientRect().left
    let canvasYOffset = window.innerHeight - game_canvas.getBoundingClientRect().bottom

    let playerCameraPosX = this.player.getX() - this.game.getCameraWidthDisplacement() 
    let percentX = playerCameraPosX / this.game.getCameraWidth()
    let domX = percentX * game_canvas.scrollWidth + canvasXOffset

    let playerCameraPosY = this.player.getY() - this.game.getCameraHeightDisplacement()
    let percentY = playerCameraPosY / this.game.getCameraHeight()
    let domY = percentY * game_canvas.scrollHeight + canvasYOffset

    return {
      x: domX,
      y: domY
    }
  }

  calculateMouseRotation(mouseX, mouseY) {
    let mouseDomPosition = this.getMouseBottomLeftDomPosition(mouseX, mouseY)
    let playerDomPosition = this.getPlayerBottomLeftDomPosition()

    return Math.atan2(
      mouseDomPosition.y - playerDomPosition.y, 
      mouseDomPosition.x - playerDomPosition.x
    )
  }

  globalMouseMoveHandler(e) {
    let rotation = this.calculateMouseRotation(e.clientX, e.clientY)

    if (!this.isMobile()) {
      this.player.setTargetRotation(rotation)
    }

    if (e.target.id === 'game_canvas') {
      let rect = e.target.getBoundingClientRect()
      let mouseXRelativeToCanvas = e.clientX - rect.left
      let mouseYRelativeToCanvas = e.clientY - rect.top

      let pixelCoord = this.game.mouseToPixelCoord(mouseXRelativeToCanvas, mouseYRelativeToCanvas)

      this.game.displayMouseDebug(pixelCoord, rotation)

      if (this.game.isBuildMode()) {
        this.game.renderBuildAtMousePosition(pixelCoord.x, pixelCoord.y)
      }
    }
  }

  initMyPlayer() {
    window.inputController = this.inputController = new InputController(this.player, this)
  }

}

module.exports = InputController
