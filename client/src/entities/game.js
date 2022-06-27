const SocketUtil = require("../util/socket_util")
const Protocol = require("../../../common/util/protocol")
const ClientHelper = require("../util/client_helper")
const Helper = require("../../../common/helper")
const Cookies = require("js-cookie")
const Blocks = require("./blocks/index")
const Mobs = require("./mobs/index")
const Eraser = require("./blocks/eraser")
const Player = require("./player")
const InputController = require("../components/input_controller")
const ChatMenu = require("../components/chat_menu")
const Constants = require("../../../common/constants.json")
const Projectiles = require("./projectiles/index")
const Pickups = require("./pickups/index")
const ObjectPool = require("../../../common/util/object_pool")
const BitmapText = require("../util/bitmap_text")
const SoundManager = require("../components/sound_manager")
const Lobby = require("../components/lobby")
const BrowseMapMenu = require("../components/browse_map_menu")
const GameSettingsMenu = require("../components/game_settings_menu")
const AnimationManager = require("./animation/animation_manager")
const PerformanceMonitor = require("./performance/performance_monitor")
const uuidv4 = require("uuid/v4")

class Game {
  constructor(main) {
    this.main = main
    this.entities = {}
    this.players = {}
    this.projectiles = {}
    this.movingObjects = {}
    this.pickups = {}
    this.mobs = {}
    this.lastFrameTime = new Date().getTime()

    this.blockColor = "#555555"
    this.simulate = false
    this.debugGraphics = {}
    this.isZoomEnabled = true
    this.NUM_TILES_PADDED_ON_SIDE = 3

    this.initRenderer()
    this.updateCanvasResolution()
    this.initPools()
    this.initAnimationManager()
    this.initPerformanceMonitor()

    this.browseMapMenu = new BrowseMapMenu(this)

    this.initProtocol(() => {
      this.initSoundManager()
      this.initTextures(() => {
        this.initChatMenu()
        this.initBlocksMenu()
        this.initPickupMenu()
        this.initOutlineFilter()
        this.initListeners()
        this.initInputController()
        this.displayHomeCharacter()

        this.main.onGameReady()
        this.initSoundManager()
      })
    })
  }

  initAnimationManager() {
    this.animationManager = new AnimationManager(this)
  }

  initChatMenu() {
    this.chatMenu = new ChatMenu(this, document.querySelector(".game_page .chat_container"))
  }

  initInputController() {
    this.inputController = new InputController(this)
  }

  initPerformanceMonitor() {
    this.performanceMonitor = new PerformanceMonitor(this)
  }

  displayHomeCharacter() {
    let data = {
      isHomeCharacter: true,
      color: "#33FFFF",
      equip: 1,
      hat: "",
      id: 53,
      name: "Kari",
      position: {
        x: 145,
        y: 150,
      },
    }

    if (!this.homePlayer) {
      this.homePlayer = new Player(this, data)
    } else {
      // make sure player is on stage
      this.app.stage.addChild(this.homePlayer.bodies.main.sprite)
    }

    this.homePlayer.assignColor(this.main.getCurrentColor())
    this.homePlayer.assignColor(this.main.getCurrentColor())
    this.homePlayer.assignHat(this.main.getCurrentHat())
    this.homePlayer.playAnimation("run")
    this.inputController.setPlayer(this.homePlayer)

    this.autoAdjustResolution({ isImmediate: true })
    this.readjustCanvasWidthHeightAndPosition()
  }

  initPools() {
    ObjectPool.create("BitmapText", BitmapText)
  }

  initListeners() {
    window.addEventListener("resize", this.resizeCanvas.bind(this), false)

    let isOnIOS = navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i)
    let unloadEvent = isOnIOS ? "pagehide" : "beforeunload"
    window.addEventListener(unloadEvent, this.onBeforeUnload.bind(this), false)

    document
      .querySelector(".background_color_picker")
      .addEventListener("input", this.onBackgroundColorPickerInput.bind(this), true)
    document
      .querySelector(".background_color_picker")
      .addEventListener("change", this.onBackgroundColorPickerChange.bind(this), true)
    document.querySelector(".new_map_btn").addEventListener("click", this.onNewMapClick.bind(this), true)
    document.querySelector(".load_map_btn").addEventListener("click", this.onLoadMapClick.bind(this), true)
    document.querySelector(".export_map_btn").addEventListener("click", this.onExportMapClick.bind(this), true)
    document.querySelector(".save_map_btn").addEventListener("click", this.onSaveMapClick.bind(this), true)
    document.querySelector("#load_map_input").addEventListener("change", this.onLoadMapInputChange.bind(this), true)

    document
      .querySelector(".ground_color_picker")
      .addEventListener("change", this.onGroundColorPickerChanged.bind(this), true)
    document
      .querySelector(".wall_color_picker")
      .addEventListener("change", this.onWallColorPickerChanged.bind(this), true)

    document.querySelector("input#level_grid").addEventListener("change", this.onToggleGridChanged.bind(this), true)
    document
      .querySelector("input#should_simulate")
      .addEventListener("change", this.onShouldSimulateChanged.bind(this), true)

    document.addEventListener("touchstart", this.onJumpBtnClick.bind(this), true)

    document.querySelector(".exit_game_btn").addEventListener("click", this.onExitGameBlick.bind(this), true)
    document.addEventListener("visibilitychange", this.onTabVisibilityChange.bind(this), true)

    document
      .querySelector(".level_editor_menu .rename_btn")
      .addEventListener("click", this.onMapRenameBtnClick.bind(this))
    document
      .querySelector(".level_editor_menu .map_name_input")
      .addEventListener("blur", this.onMapNameInputBlur.bind(this))
    document
      .querySelector(".level_editor_menu .map_name_input")
      .addEventListener("keyup", this.onMapNameInputKeyup.bind(this))
    document
      .querySelector(".level_editor_menu .blocks_menu")
      .addEventListener("click", this.onBlocksMenuClick.bind(this), true)
    document
      .querySelector(".level_editor_menu .pickups_menu")
      .addEventListener("click", this.onPickupsMenuClick.bind(this), true)

    let elements = document.querySelectorAll(".level_editor_menu .blocks_menu .block")
    for (let i = 0; i < elements.length; i++) {
      let el = elements[i]

      el.addEventListener("mouseover", this.onBlockMouseover.bind(this), true)
      el.addEventListener("mouseout", this.onBlockMouseout.bind(this), true)
    }

    let pickups = document.querySelectorAll(".level_editor_menu .pickups_menu .pickup_entry")
    for (let i = 0; i < pickups.length; i++) {
      let el = pickups[i]

      el.addEventListener("mouseover", this.onPickupMouseover.bind(this), true)
      el.addEventListener("mouseout", this.onPickupMouseout.bind(this), true)
    }

    Array.from(document.querySelectorAll(".mute_btn")).forEach((el) => {
      el.addEventListener("click", this.onMuteBtnClick.bind(this), true)
    })
  }

  isLoggedIn() {
    return this.main.authentication.isLoggedIn()
  }

  shouldExitWithoutSaving() {
    if (!this.isLoggedIn()) return true
    if (!this.isMapOwnedByPlayer()) return true

    return !this.isMapDirty || confirm("Exit without saving?")
  }

  onExitGameBlick() {
    if (this.isLevelEditor) {
      if (this.shouldExitWithoutSaving()) {
        this.updateThumbnailOnServer()
        this.exitLevelEditor()
        this.goToHomepage()
      }
    } else {
      if (this.player.isHost()) {
        this.leaveStage()
      } else {
        this.leaveGame()
        if (this.lobby) {
          this.lobby.hide()
        }
      }
      this.goToHomepage()
    }
  }

  onMapRenameBtnClick(e) {
    let renameBtn = e.target.closest(".rename_btn")
    if (!renameBtn) return

    document.querySelector(".level_editor_menu .map_name_value").style.display = "none"
    document.querySelector(".level_editor_menu .map_name_input").style.display = "inline-block"
    document.querySelector(".level_editor_menu .map_name_input").value = this.mapName
    document.querySelector(".level_editor_menu .map_name_input").focus()
  }

  hideMapNameInput() {
    document.querySelector(".level_editor_menu .map_name_value").style.display = "inline-block"
    document.querySelector(".level_editor_menu .map_name_input").style.display = "none"
  }

  onMapNameInputBlur(e) {
    if (this.omitBlurEvents) return
    this.setMapName(e.target.value)
    this.hideMapNameInput()
  }

  onMapNameInputKeyup(e) {
    if (e.which === 13 || e.which === 27) {
      // enter or esc
      this.setMapName(e.target.value)
      this.omitBlurEvents = true
      e.target.blur()
      this.omitBlurEvents = false
      this.hideMapNameInput()
    }
  }

  setMapName(name) {
    SocketUtil.emit("LevelEditor", { action: "name", data: name })
    this.isMapDirty = true
  }

  onNewMapClick() {
    SocketUtil.emit("LevelEditor", { action: "new" })
  }

  onSaveMapClick() {
    let idToken = this.main.authentication.idToken
    if (!idToken) {
      this.main.displayError({ message: "Must login to save" })
      return
    }

    this.updateThumbnailOnServer(() => {
      let url = this.main.getServerHttpUrl() + "/save_map"

      let body = {
        idToken: idToken,
        gameUid: this.gameUid,
        uid: this.main.authentication.uid
      }

      ClientHelper.httpPost(url, body, {
        success: (data) => {
          try {
            let result = JSON.parse(data)
            if (result.error) {
              this.main.displayError({ message: result.error })
            } else {
              this.main.displaySuccess({ message: "Saved" })
              this.isMapDirty = false
            }
          } catch (e) {
            this.main.displayError({ message: "Failed to save" })
          }
        },
        error: () => {
          this.main.displayError({ message: "Failed to save" })
        },
      })
    })
  }

  onExportMapClick() {
    this.updateThumbnailOnServer(() => {
      let url = this.main.getServerHttpUrl() + "/export_map?game_uid=" + this.gameUid

      ClientHelper.httpRequest(url, {
        success: (data) => {
          try {
            let error = JSON.parse(data).error
            if (error) {
              this.main.displayError({ message: "Export failed" })
            } else {
              this.saveToDisk("archerfall.json", data)
            }
          } catch(e) {
            this.main.displayError({ message: "Export failed" })
          }
        },
        error: () => {},
      })
    })
  }

  onLoadMapClick() {
    document.querySelector("#load_map_input").click()
  }

  onLoadMapInputChange(e) {
    let file = e.target.files[0]

    var reader = new FileReader()
    reader.readAsText(file, "UTF-8")
    reader.onload = function (evt) {
      let fileContent = evt.target.result

      SocketUtil.emit("LevelEditor", { action: "import", data: fileContent })

      document.querySelector("#load_map_input").value = ""
    }
    reader.onerror = function (evt) {
      this.main.onPlayerCantJoin({ message: "Unable to load save file" })
    }
  }

  saveToDisk(fileName, data) {
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  onMuteBtnClick(e) {
    let el = e.target.closest(".mute_btn")
    if (el.classList.contains("on")) {
      el.classList.remove("on")
      el.classList.add("off")
      this.soundManager.setEffectsVolume(0)
      this.soundManager.setBackgroundVolume(0)

      Cookies.set("volume", "off")
    } else {
      el.classList.remove("off")
      el.classList.add("on")
      this.soundManager.setEffectsVolume(this.soundManager.getSavedOrDefaultEffectsVolume())
      this.soundManager.setBackgroundVolume(this.soundManager.getSavedOrDefaultBackgroundVolume())

      Cookies.set("volume", "on")
    }
  }

  onBlocksMenuClick(e) {
    let block = e.target.closest(".block")
    if (!block) return

    let selected = document.querySelector(".block.selected")
    if (selected) {
      selected.classList.remove("selected")
    }

    block.classList.add("selected")
    if (block.dataset.type === "-1") {
      this.exitBuildMode()
    } else {
      let klass = Blocks.forType(block.dataset.type)
      klass.equipForBuilding(this, {
        x: 0,
        y: 0,
      })
    }
  }

  onBlockMouseover(e) {
    const slot = e.target.closest(".block")
    if (!slot) return

    let tooltip = document.querySelector("#building_menu_tooltip")
    tooltip.style.display = "block"

    let boundingRect = slot.getBoundingClientRect() 
    tooltip.querySelector(".entity_name").innerText = slot.dataset.name
    this.repositionTooltip(slot, boundingRect)
  }

  onBlockMouseout(e) {
    let tooltip = document.querySelector("#building_menu_tooltip")
    tooltip.style.display = "none"
  }

  onPickupsMenuClick(e) {
    let block = e.target.closest(".pickup_entry")
    if (!block) return

    const isSelected = block.classList.contains("selected")

    SocketUtil.emit("EditLevel", {
      pickupType: block.dataset.type,
      isEnabled: !isSelected
    })
  }

  onPickupMouseover(e) {
    const slot = e.target.closest(".pickup_entry")
    if (!slot) return

    let tooltip = document.querySelector("#building_menu_tooltip")
    tooltip.style.display = "block"

    let boundingRect = slot.getBoundingClientRect() 
    tooltip.querySelector(".entity_name").innerText = slot.dataset.name
    this.repositionTooltip(slot, boundingRect)
  }

  onPickupMouseout(e) {
    let tooltip = document.querySelector("#building_menu_tooltip")
    tooltip.style.display = "none"
  }


  repositionTooltip(slot, boundingRect) {
    let tooltip = document.querySelector("#building_menu_tooltip")

    const bottomMargin = 25
    let left = boundingRect.x - tooltip.offsetWidth / 2 + slot.offsetWidth / 2
    let top = boundingRect.y + window.scrollY - tooltip.offsetHeight - bottomMargin
    const margin = 25

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - tooltip.offsetWidth - margin, left) // cant be more than than margin

    if (top < margin) {
      // show at bottom instead
      top = boundingRect.y + bottomMargin * 2
    }
    top = Math.max(margin, top) // cant be lower than margin
    top = Math.min(window.innerHeight - tooltip.offsetHeight - margin, top) // cant be more than than margin

    tooltip.style.left = left + "px"
    tooltip.style.top = top + "px"
  }

  selectNoBuild() {
    let selected = document.querySelector(".block.selected")
    if (selected) {
      selected.classList.remove("selected")
    }

    let block = document.querySelector(".block[data-type='-1']")
    block.classList.add("selected")
  }

  onJumpBtnClick(e) {
    // if (!this.isInRoom) return

    // if (!e.target.closest(".nipple")) {
    //   this.sendJumpAction()
    //   // game_canvas.focus()
    // }
  }

  sendJumpAction() {
    let data = { jump: true }

    if (this.main.isMobile) {
      data.idle = false
      data.direction = this.getProtocolDirection(this.inputController.moveDirection)
    } else {
      data.controlKeys = this.lastControlKeys
    }

    this.sendPlayerInput(data)
  }

  sendPlayerInput(data) {
    this.performanceMonitor.markPlayerInputTime()
    SocketUtil.emit("PlayerInput", data)
  }

  sendRollAction() {
    let data = { roll: true }

    if (this.main.isMobile) {
      data.idle = false
      data.direction = this.getProtocolDirection(this.inputController.moveDirection)
    } else {
      data.controlKeys = this.lastControlKeys
    }

    this.sendPlayerInput(data)
  }

  onBackgroundColorPickerInput(e) {
    let color = e.target.value

    this.setBackgroundColor(color)
  }

  onBackgroundColorPickerChange(e) {
    SocketUtil.emit("EditLevel", { backgroundColor: this.backgroundColor })
    this.isMapDirty = true
  }

  onGroundColorPickerChanged(e) {
    let color = e.target.value

    this.blockColor = color

    if (this.buildBlock.isGround()) {
      this.buildBlock.setColor(color)
    }

    SocketUtil.emit("EditLevel", { foregroundColor: this.blockColor })
    this.isMapDirty = true
  }

  onWallColorPickerChanged(e) {
    let color = e.target.value

    this.wallColor = color

    if (this.buildBlock.isWall()) {
      this.buildBlock.setColor(color)
    }

    SocketUtil.emit("EditLevel", { wallColor: this.wallColor })
    this.isMapDirty = true
  }

  onToggleGridChanged(e) {
    if (e.target.checked) {
      this.showGrid()
    } else {
      this.hideGrid()
    }
  }

  onShouldSimulateChanged(e) {
    this.simulate = e.target.checked
    SocketUtil.emit("EditLevel", { simulate: this.simulate })
  }

  onBeforeUnload() {
    this.leaveGame()
  }

  leaveStage() {
    SocketUtil.emit("LeaveGame", { isLeaveStage: true })
  }

  leaveGame() {
    SocketUtil.emit("LeaveGame", {})
  }

  getPixelRatio() {
    return Math.min(1, window.devicePixelRatio)
  }

  getCanvasWidth() {
    return window.innerWidth
  }

  getCanvasHeight() {
    return window.innerHeight
  }

  resizeCanvas() {
    this.autoAdjustResolution()
    this.main.showHideRotateDevice()
  }

  addProjectile(projectile) {
    this.projectiles[projectile.getId()] = projectile
  }

  removeProjectile(projectile) {
    delete this.projectiles[projectile.getId()]
  }

  addMob(mob) {
    this.mobs[mob.getId()] = mob
  }

  removeMob(mob) {
    delete this.mobs[mob.getId()]
  }

  addMovingObject(movingObject) {
    this.movingObjects[movingObject.getId()] = movingObject
  }

  removeMovingObject(movingObject) {
    delete this.movingObjects[movingObject.getId()]
  }

  addPickup(pickup) {
    this.pickups[pickup.getId()] = pickup
  }

  removePickup(pickup) {
    delete this.pickups[pickup.getId()]
  }

  addPlayer(player) {
    this.players[player.getId()] = player

    this.showHideWaitingForPlayers()
  }

  removePlayer(player) {
    delete this.players[player.getId()]

    this.showHideWaitingForPlayers()
  }

  showHideWaitingForPlayers() {
    if (!this.isInRoom) return

    if (this.getPlayerCount() > 1 || this.isLevelEditor) {
      document.querySelector(".waiting_for_players_message").style.display = "none"
    } else {
      document.querySelector(".waiting_for_players_message").style.display = "block"
    }
  }

  displayMouseDebug(pixelCoord, rotation) {
    let label = "x y(" + Math.floor(pixelCoord.x) + "px , " + Math.floor(pixelCoord.y) + "px)"
    document.querySelector(".debug_menu .pixel_coord").innerText = label

    label =
      "row col(" +
      Math.floor(pixelCoord.y / Constants.tileSize) +
      " , " +
      Math.floor(pixelCoord.x / Constants.tileSize) +
      ")"
    document.querySelector(".debug_menu .row_coord").innerText = label

    document.querySelector(".debug_menu .rotation").innerText = Math.floor((rotation * 180) / Math.PI) + " deg"
  }

  // changes the CSS width/height
  autoAdjustResolution(isImmediate) {
    const nativeResolution = {
      width: this.getCameraWidth(),
      height: this.getCameraHeight(),
    }

    const deviceWidth = this.getCanvasWidth()
    const deviceHeight = this.getCanvasHeight()

    let scaleFactor = deviceWidth / nativeResolution.width
    // let minScale = this.isMobile() ? 0.8 : 1
    // scaleFactor = Math.max(minScale, scaleFactor)
    // scaleFactor = Math.min(1.2, scaleFactor)

    let timeout = isImmediate ? 0 : 500
    clearTimeout(this.updateCanvasResolutionTimeout)
    this.updateCanvasResolutionTimeout = setTimeout(() => {
      this.resolution = scaleFactor
      this.updateCanvasResolution()
    }, timeout)
  }

  hideLeaderboard() {
    document.querySelector(".leaderboard").style.display = "none"
  }

  renderLeaderboard(data) {
    document.querySelector(".leaderboard").style.display = "block"
    document.querySelector(".winner_message").innerText = data.winner + " wins"

    document.querySelector(".next_round_remaining").innerText = Helper.stringifyTimeShort(3)
  }

  createRoundScore(name, score) {
    let row = document.createElement("div")
    row.classList.add("score_row")

    let col = document.createElement("div")
    col.classList.add("score_name")
    col.innerText = name
    row.appendChild(col)

    let scoreSlotContainer = document.createElement("div")
    scoreSlotContainer.classList.add("score_slot_container")

    let numRounds = this.getNumOfRounds()
    for (let i = 0; i < numRounds; i++) {
      let scoreSlot = document.createElement("div")
      scoreSlot.classList.add("score_slot")

      let isFilled = score > i
      if (isFilled) {
        scoreSlot.classList.add("filled")
      }

      scoreSlotContainer.appendChild(scoreSlot)
    }

    row.appendChild(scoreSlotContainer)

    document.querySelector(".round_end_modal .scores").appendChild(row)
  }

  getNumOfRounds() {
    return 3
  }

  createLeaderboardRow(ranking) {
    let row = document.createElement("div")
    row.classList.add("ranks_row")
    if (ranking.name === this.player.name) {
      row.classList.add("me")
    }

    let col = document.createElement("div")
    col.classList.add("rank_col")
    col.classList.add("col")
    col.innerText = ranking.rank
    row.appendChild(col)

    col = document.createElement("div")
    col.classList.add("name_col")
    col.classList.add("col")
    col.innerText = ranking.name
    row.appendChild(col)

    col = document.createElement("div")
    col.classList.add("kills_col")
    col.classList.add("col")
    col.innerText = ranking.score
    row.appendChild(col)

    document.querySelector(".ranks_container").appendChild(row)
  }

  shouldPositionGameCanvasToTop() {
    return document.body.classList.contains("editor")
  }

  positionGameCanvasForHomePage() {
    this.app.renderer.view.classList.add('home')
    this.app.renderer.view.classList.remove('game')

    this.app.renderer.view.style.width = "125px"
    this.app.renderer.view.style.height = "126px"

    this.app.renderer.view.style.top = 'unset'
    this.app.renderer.view.style.bottom = "20px"
    document.querySelector(".customize_panel").style.bottom = '135px'
  }

  updateGameCanvasDuringGame() {
    if (this.shouldPositionGameCanvasToTop()) {
      this.app.renderer.view.style.top = "50px"
    } else {
      this.app.renderer.view.style.top = "50%"
    }

    this.app.renderer.view.classList.remove('home')
    this.app.renderer.view.classList.add('game')

    let canvasWidth = window.innerWidth
    let canvasHeight = window.innerHeight
    let verticalPadding = 0
    if (this.isLevelEditor) {
      verticalPadding = 300
    }

    let aspectRatio = (this.getColCount() / this.getCameraRowCount())
    let maxHeight = window.innerHeight - verticalPadding
    let maxWidth = maxHeight * aspectRatio

    let targetWidth = Math.min(maxWidth, canvasWidth)
    let targetHeight = targetWidth / aspectRatio

    this.app.renderer.view.style.width = targetWidth + "px"
    this.app.renderer.view.style.height = targetHeight + "px"

  }

  updateCanvasResolution() {
    if (!this.isInRoom) {
      this.positionGameCanvasForHomePage()
      return
    } 

    this.updateGameCanvasDuringGame()
  }

  getCameraWidth() {
    return this.getCameraColCount() * Constants.tileSize
  }

  getCameraHeight() {
    return this.getCameraRowCount() * Constants.tileSize
  }

  getGameWidth() {
    return this.getColCount() * Constants.tileSize
  }

  getGameHeight() {
    return this.getRowCount() * Constants.tileSize
  }

  mouseToPixelCoord(x, y) {
    let cssWidth = parseInt(this.app.renderer.view.style.width)
    let cssHeight = parseInt(this.app.renderer.view.style.height)

    let xPercent = x / cssWidth
    let yPercent = y / cssHeight

    let pixelX = xPercent * this.getCameraWidth()
    let pixelY = this.getCameraHeight() - yPercent * this.getCameraHeight()

    pixelX = Math.max(pixelX, 0)
    pixelX = Math.min(pixelX, this.getCameraWidth())

    pixelY = Math.max(pixelY, 0)
    pixelY = Math.min(pixelY, this.getCameraHeight())

    return {
      x: pixelX + this.getCameraWidthDisplacement(),
      y: pixelY + this.getCameraHeightDisplacement()
    }
  }

  isMobile() {
    return this.main.isMobile
  }

  initTextures(cb) {
    this.loadTempAssets()
    this.generateGraphicsTextures()
    this.loadAtlas()
    this.loadFonts()
    this.loadDragonBonesResources()

    this.app.loader.load((loader, resources) => {
      cb()
    })
  }

  loadTempAssets() {
    let tempAssets = [
      'displacement_map.png',
      'joystick_handle_simple.png',
      'joystick_base_simple.png',
      'joystick_base_big.png',
      'shoot_control.png',
      'attack_button.png',
      'jump_button.png',
      'crosshair.png',
      'dagger.png',
      'slash.png',
      'bat.png',
      'echo.png'
    ]
    tempAssets.forEach((asset) => {
      PIXI.Texture.addToCache(PIXI.Texture.from("/assets/images/" + asset), asset)
    })

    let backgroundAssets = []
    backgroundAssets.forEach((asset) => {
      PIXI.Texture.addToCache(PIXI.Texture.from("/assets/images/backgrounds/" + asset), asset)
    })
  }

  generateGraphicsTextures() {
    // graphics texture
    let preloadedGraphics = this.getPreloadedGraphics()
    for (let key in preloadedGraphics) {
      let graphic = preloadedGraphics[key]
      let texture = graphic.generateCanvasTexture()
      PIXI.Texture.addToCache(texture, key)
    }
  }

  loadAtlas() {
    this.app.loader.add("/assets/images/backgrounds/archerfall-atlas-2222.json")
  }

  loadFonts() {
    this.app.loader.add("/assets/fonts/tahoma_2.fnt")
  }

  loadDragonBonesResources() {
    this.getDragonBonesResources().forEach((resource) => {
      this.app.loader.add(resource, resource)
    })
  }

  getDragonBonesProjectName() {
    return "humans"
  }

  getDragonBonesResources() {
    let folder = "/assets/dragonbones/"
    let project = this.getDragonBonesProjectName()

    let files = [project + "_ske.json", project + "_tex.json", project + "_tex.png"]

    return files.map((file) => {
      return folder + file
    })
  }

  getPreloadedGraphics() {
    return {}
  }

  initRenderer() {
    this.canvas = document.getElementById("game_canvas")

    PIXI.settings.ROUND_PIXELS = true
    PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false // reduces webgl unsupported errors

    window.app = this.app = new PIXI.Application({
      view: this.canvas,
      forceCanvas: false,
      antialias: false,
      roundPixels: true,
      width: 1000,
      height: 600,
    })

    let type = "WebGL"
    if (!PIXI.utils.isWebGLSupported()) {
      type = "canvas"
    }

    PIXI.utils.sayHello(type)

    if (!this.app) return false

    // this.app.ticker.maxFPS = 30

    this.app.stage.name = "Stage"
    this.app.stage.scale.y = -1
    this.app.stage.position.y = this.getStageYOffset()
    this.app.stage.alpha = 1
    // this.app.renderer.plugins.interaction.moveWhenInside = true

    // this.app.renderer.backgroundColor = 0x222222
    this.app.renderer.backgroundColor = 0x666666
  }

  initStage() {
    this.gridRulerSprite = this.createGridRuleSprite()
    this.levelContainer = this.createLevelContainer()
    this.unitsContainer = this.createUnitsContainer()
    this.foregroundContainer = this.createForegroundContainer()
    this.groundContainer = this.createGroundContainer()
    this.effectsContainer = this.createEffectsContainer()
    this.backgroundContainer = this.createBackgroundContainer()

    this.app.stage.addChild(this.backgroundContainer)
    this.app.stage.addChild(this.levelContainer)
    this.app.stage.addChild(this.groundContainer)
    this.app.stage.addChild(this.unitsContainer)
    this.app.stage.addChild(this.foregroundContainer)
    this.app.stage.addChild(this.effectsContainer)
    this.app.stage.addChild(this.gridRulerSprite)
    this.app.stage.scale.set(1,-1)

    this.readjustCanvasWidthHeightAndPosition()
  }

  // changes canvas width + height
  readjustCanvasWidthHeightAndPosition() {
    this.app.renderer.resize(this.getCameraWidth(), this.getCameraHeight())

    // actual gamewidth longer than what camera shows to account mirroring
    this.app.stage.position.x = -this.getCameraWidthDisplacement()

    this.app.stage.position.y = this.getStageYOffset() + this.getCameraHeightDisplacement()

    if (this.isInRoom) {
      this.backgroundContainer.width = this.getGameWidth()
      this.backgroundContainer.height = this.getGameHeight()

      this.gridRulerSprite.width = this.getGameWidth()
      this.gridRulerSprite.height = this.getGameHeight()
    }
  }

  onTabVisibilityChange() {
    setTimeout(() => {
      this.app.stage.position.y = this.getStageYOffset() + this.getCameraHeightDisplacement()
    }, 100)
  }

  getStageYOffset() {
    return this.app.renderer.height / this.app.renderer.resolution
  }

  createBackgroundContainer() {
    let texture = PIXI.utils.TextureCache["square_white.png"]
    const width = this.getColCount() * Constants.tileSize
    const height = this.getRowCount() * Constants.tileSize
    const sprite = new PIXI.Sprite(texture)
    sprite.width = width
    sprite.height = width
    sprite.name = "Background"

    return sprite
  }

  createLevelContainer() {
    let container = new PIXI.Container()
    container.name = "LevelContainer"

    return container
  }

  createForegroundContainer() {
    let container = new PIXI.Container()
    container.name = "ForegroundContainer"

    return container
  }

  createGroundContainer() {
    let container = new PIXI.Container()
    container.name = "GroundContainer"
    // container.filters = [this.outlineFilter]

    return container
  }

  createUnitsContainer() {
    let container = new PIXI.Container()
    container.name = "UnitsContainer"

    return container
  }

  createEffectsContainer() {
    let container = new PIXI.Container()
    container.name = "EffectsContainer"

    return container
  }

  createGridRuleSprite() {
    let texture = PIXI.utils.TextureCache["grid_ruler.png"]
    const width = this.getColCount() * Constants.tileSize
    const height = this.getRowCount() * Constants.tileSize
    const sprite = new PIXI.TilingSprite(texture, width, height)
    sprite.name = "gridRuler"
    sprite.alpha = 0
    sprite.tint = 0x555555
    // sprite.anchor.set(0.5)
    return sprite
  }

  enterDefaultBuildMode() {
    Blocks.Ground.equipForBuilding(this, {
      x: 0,
      y: 0,
    })
  }

  getCameraWidthDisplacement() {
    return (this.getGameWidth() - this.getCameraWidth()) / 2
  }

  getCameraHeightDisplacement() {
    return (this.getGameHeight() - this.getCameraHeight()) / 2
  }

  enterEraseMode(x, y) {
    this.gridRulerSprite.alpha = 0.3
    Eraser.equipForBuilding(this, { x: 0, y: 0 })
  }

  enterBuildMode(block) {
    // remove existing
    if (this.buildBlock) {
      this.buildBlock.remove()
    }

    this.buildBlock = block
  }

  showGrid() {
    this.gridRulerSprite.alpha = 0.3
  }

  hideGrid() {
    this.gridRulerSprite.alpha = 0
  }

  exitBuildMode() {
    if (this.buildBlock) this.buildBlock.remove()
    this.buildBlock = null
  }

  isBuildMode() {
    return this.buildBlock
  }

  getCameraRowCount() {
    if (this.isHomePage()) {
      return 4
    }

    return this.rowCount
  }

  getCameraColCount() {
    if (this.isHomePage()) {
      return 3
    }

    return this.colCount
  }

  isHomePage(){
    return !this.isInRoom
  }

  getRowCount() {
    return this.getCameraRowCount() + this.NUM_TILES_PADDED_ON_SIDE * 2
  }

  getColCount() {
    return this.getCameraColCount() + this.NUM_TILES_PADDED_ON_SIDE * 2
  }

  renderBuildAtMousePosition(x, y) {
    if (!this.buildBlock) return

    this.buildBlock.renderAtMousePosition(x, y)
  }

  getSnappedPosX(x, width) {
    const objectSize = width
    const offset = (objectSize / Constants.tileSize - 1) * 16

    const col = Math.floor((x + offset) / Constants.tileSize)
    return col * Constants.tileSize + Constants.tileSize / 2 - offset
  }

  getSnappedPosY(y, height) {
    const objectSize = height
    const offset = (objectSize / Constants.tileSize - 1) * 16

    const row = Math.floor((y + offset) / Constants.tileSize)
    return row * Constants.tileSize + Constants.tileSize / 2 - offset
  }

  initSoundManager() {
    this.soundManager = new SoundManager(this)
  }

  initProtocol(onReady) {
    if (!this.protocol) {
      Protocol.initClient((error, protocol) => {
        if (error) {
          this.main.onPlayerCantJoin({ message: "Your game client is outdated. Please Refresh browser." })
          return
        }

        this.protocol = protocol
        SocketUtil.init({ protocol: protocol })
        this.initSocketHandlers()
        onReady()
      })
    }
  }

  initSocketHandlers() {
    SocketUtil.on("LobbyJoined", this.onLobbyJoined.bind(this))
    SocketUtil.on("OtherPlayerLobbyJoined", this.onOtherPlayerLobbyJoined.bind(this))
    SocketUtil.on("LobbyLeft", this.onLobbyLeft.bind(this))
    SocketUtil.on("LobbyUpdated", this.onLobbyUpdated.bind(this))

    SocketUtil.on("GameListAdded", this.onGameListAdded.bind(this))
    SocketUtil.on("GameListRemoved", this.onGameListRemoved.bind(this))

    SocketUtil.on("ServerChat", this.onServerChat.bind(this))
    SocketUtil.on("JoinGame", this.onJoinGame.bind(this))
    SocketUtil.on("GoToScreen", this.onGoToScreen.bind(this))
    SocketUtil.on("MapData", this.onMapData.bind(this))
    SocketUtil.on("AFK", this.onAFK.bind(this))
    SocketUtil.on("Pong", this.onPong.bind(this))
    SocketUtil.on("CantJoin", this.onCantJoin.bind(this))
    SocketUtil.on("GameState", this.onGameState.bind(this))
    SocketUtil.on("PlaySound", this.onPlaySound.bind(this))
    SocketUtil.on("PlayAnimation", this.onPlayAnimation.bind(this))
    SocketUtil.on("OtherPlayerJoined", this.onOtherPlayerJoined.bind(this))
    SocketUtil.on("Block", this.onBlock.bind(this))
    SocketUtil.on("PickupEntry", this.onPickupEntry.bind(this))
    SocketUtil.on("Projectile", this.onProjectile.bind(this))
    SocketUtil.on("Pickup", this.onPickup.bind(this))
    SocketUtil.on("Player", this.onPlayer.bind(this))
    SocketUtil.on("SessionResume", this.onSessionResume.bind(this))
    SocketUtil.on("RoundEnd", this.onRoundEnd.bind(this))
    SocketUtil.on("RoundStart", this.onRoundStart.bind(this))
    SocketUtil.on("Debug", this.onDebug.bind(this))
    SocketUtil.on("GameUpdated", this.onGameUpdated.bind(this))
    SocketUtil.on("PlayClientAnimation", this.animationManager.playAnimation.bind(this.animationManager))
  }

  onServerChat(data) {
    if (this.lobby) {
      this.lobby.chatMenu.onServerChat(data)
    }

    this.chatMenu.onServerChat(data)
  }

  onDebug(data) {
    if (data.mode === "raycast") {
      data.points.forEach((point) => {
        this.debugPoint(point)
      })
    } else if (data.mode === "polygon") {
      this.debugPolygon(data.points)
    } else if (data.mode === "circle") {
      this.debugCircle(data.points, data.radius)
    }
  }

  onGameUpdated(data) {
    this.tickRate = data.tickRate

    this.handleTimeOrbWarpEffect()
  }

  handleTimeOrbWarpEffect() {
    if (this.isSlowMotion()) {
      this.startScreenWarp()
    } else {
      this.stopScreenWarp()
    }
  }

  isSlowMotion() {
    return this.tickRate < 6
  }

  debugPoint(point) {
    let texture = PIXI.utils.TextureCache["square_white.png"]
    let sprite = new PIXI.Sprite(texture)
    sprite.width = 2
    sprite.height = 2
    sprite.anchor.set(0.5)
    sprite.tint = 0xff0000
    sprite.position.set(point.x, point.y)
    this.app.stage.addChild(sprite)
  }

  debugPolygon(points) {
    let pointsArray = points
      .map((point) => {
        return [point.x, point.y]
      })
      .flat()

    let graphics = new PIXI.Graphics()
    graphics.id = this.generateId()
    graphics.lineStyle(4, 0xff0000, 0.7)
    graphics.beginFill(0x00ff00)
    graphics.drawPolygon(pointsArray)
    graphics.endFill()
    graphics.alpha = 0.3

    this.effectsContainer.addChild(graphics)

    // for cleanup later
    this.debugGraphics[graphics.id] = {
      timestamp: this.serverTimestamp,
      graphics: graphics,
    }
  }

  generateId() {
    return uuidv4()
  }

  debugCircle(points, radius) {
    let graphics = new PIXI.Graphics()
    graphics.id = this.generateId()
    graphics.beginFill(0x00ff00)
    graphics.drawCircle(points[0].x, points[0].y, radius)
    graphics.endFill()
    graphics.alpha = 0.3

    this.effectsContainer.addChild(graphics)

    // for cleanup later
    this.debugGraphics[graphics.id] = {
      timestamp: this.serverTimestamp,
      graphics: graphics,
    }
  }

  removePreviousData() {
    this.hideLeaderboard()
    document.querySelector(".disconnected_msg").style.display = "none"
    document.querySelector(".round_end_modal").style.display = "none"

    this.chatMenu.clear()

    this.stopScreenWarp()

    for (let id in this.entities) {
      this.entities[id].remove()
    }

    this.entities = {}
    this.buildBlock = null

    // clean up stage
    while (this.app.stage.children[0]) {
      this.app.stage.removeChild(this.app.stage.children[0])
    }
  }

  stopAllBackgroundMusic() {
    this.soundManager.stopAllBackgroundMusic()
  }

  showRound(round) {
    if (round === 1) return // no need to display (map is display instead)

    let el = document.querySelector(".round_message")
    el.style.display = "block"
    el.innerText = "Round " + round

    let sourceFontSize = this.main.isMobile ? 15 : 30
    let desiredFontSize = this.main.isMobile ? 30 : 50

    let size = { size: sourceFontSize }
    let tween = new TWEEN.Tween(size)
      .to({ size: desiredFontSize }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        el.style.fontSize = size.size + "px"
      })
      .onComplete(() => {
        setTimeout(() => {
          el.style.display = "none"
        }, 700)
      })

    tween.start()
  }

  // https://codepen.io/chles/pen/aNxMxQ
  startScreenWarp() {
    if (!this.displacementSprite) {
      this.displacementSprite = new PIXI.Sprite(PIXI.utils.TextureCache["displacement_map.png"])
      this.displacementSprite.scale.set(2)
      this.displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT

      this.displacementFilter = new PIXI.filters.DisplacementFilter(this.displacementSprite)
    }

    this.app.stage.addChild(this.displacementSprite)
    this.app.stage.filters = [this.displacementFilter]

    let count = 0

    this.screenWarpInterval = setInterval(() => {
      this.displacementSprite.position.x = count * 10
      this.displacementSprite.position.y = count * 10

      count += 0.2
    }, 30)
  }

  addSquareSprite() {
    let sprite = new PIXI.Sprite(PIXI.utils.TextureCache["square_white.png"])
    this.app.stage.addChild(sprite)
    sprite.position.set(500, 400)
    this.square = sprite
  }

  stopScreenWarp() {
    if (!this.displacementSprite) return
    this.app.stage.removeChild(this.displacementSprite)
    this.app.stage.filters = []
    this.displacementSprite.position.x = 0
    this.displacementSprite.position.y = 0
    clearInterval(this.screenWarpInterval)
    this.displacementSprite = null
  }

  onLobbyJoined(data) {
    if (this.lobby) {
      this.lobby.cleanup()
    }

    this.lobby = new Lobby(this, data)

    this.lobby.show()
  }

  onDisconnectedFromLobby() {
    clearInterval(this.keepAliveInterval)
  }

  onOtherPlayerLobbyJoined(data) {
    this.lobby.addPlayer(data.player)
  }

  onLobbyLeft(data) {
    this.lobby.removePlayer(data.player)
  }

  onLobbyUpdated(data) {
    if (data.thumbnail) {
      this.lobby.updateThumbnail(data.thumbnail)
    }

    if (data.hostId) {
      this.lobby.setHostId(data.hostId)
    }

    if (data.hasOwnProperty("isPrivate")) {
      this.lobby.setIsPrivate(data.isPrivate)
    }
  }

  onGameListAdded(data) {}

  onGameListRemoved(data) {}

  onOtherPlayerLobbyJoin(data) {
    this.lobby.addPlayer(data)
  }

  onMapData(data) {
    this.rowCount = data.rowCount
    this.colCount = data.colCount

    this.initMap(data)
    this.readjustCanvasWidthHeightAndPosition()
    this.autoAdjustResolution({ isImmediate: true })
  }

  onGoToScreen(data) {
    if (data.name === "Lobby") {
      this.goToHomepage()
    }
  }

  getPlayerCount() {
    return Object.keys(this.players).length
  }

  onJoinGame(data) {
    this.removePreviousData()

    this.rowCount = data.mapData.rowCount
    this.colCount = data.mapData.colCount
    this.isCustomGame = data.isCustomGame

    this.playerId = data.playerId
    this.isInRoom = true
    this.isAFK = false
    this.gameUid = data.gameUid

    this.tickRate = data.tickRate
    this.initStage()

    this.main.showPage("game_page")
    this.main.enableJoin()
    document.querySelector("html").style.backgroundColor = "#000000"

    this.isLevelEditor = data.isLevelEditor

    // must be called after isLevelEditor has been set
    this.initMap(data.mapData)

    if (this.isLevelEditor) {
      this.initLevelEditor(data.mapData)
      this.enterDefaultBuildMode()
    } else {
      this.hideLevelEditor()
    }

    this.displayMapName()

    if (this.gameTicker) {
      this.app.ticker.remove(this.gameTicker)
    }

    this.gameTicker = (time) => {
      this.updateGame(time)
    }

    this.app.ticker.add(this.gameTicker)

    this.autoAdjustResolution({ isImmediate: true })
    this.inputController.initMobileControls()
    this.handleTimeOrbWarpEffect()

    // wait till resolution has been adjusted to canvas
    // only then do we show stage
    setTimeout(() => {
      this.app.stage.alpha = 1
    }, 10)

    this.trackPing()
  }

  initLevelEditor(mapData) {
    document.body.classList.add("editor")
    this.showGrid()
    document.querySelector(".background_color_picker").value = mapData.backgroundColor
    document.querySelector(".ground_color_picker").value = mapData.foregroundColor
    document.querySelector(".wall_color_picker").value = mapData.wallColor
    this.blockColor = mapData.foregroundColor
    this.wallColor = mapData.wallColor

    document.querySelector(".level_editor_menu").style.display = "block"
    document.querySelector(".debug_menu").style.display = "block"

    if (this.isMapOwnedByPlayer()) {
      this.showSaveButton()
    } else {
      this.hideSaveButton()
    }

    this.updateCanvasResolution()
  }

  showSaveButton() {
    document.querySelector(".save_map_btn").style.display = 'inline-block'
  }

  hideSaveButton() {
    document.querySelector(".save_map_btn").style.display = 'none'
  } 

  isMapOwnedByPlayer() {
    if (!this.player) return false
    return this.mapCreator === this.player.name
  }

  hideLevelEditor() {
    document.body.classList.remove("editor")
    this.hideGrid()

    document.querySelector(".level_editor_menu").style.display = "none"
    document.querySelector(".debug_menu").style.display = "none"
  }

  displayMapName() {
    document.querySelector(".map_name_message").style.display = "block"
    document.querySelector(".map_name_message .level_map_name").innerText = this.mapName
    document.querySelector(".map_name_message .level_map_creator").innerText = "by " + this.mapCreator

    let opacity = { opacity: 0 }

    const fadeInTween = new TWEEN.Tween(opacity)
      .to({ opacity: 0.4 }, 2000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        document.querySelector(".map_name_message").style.opacity = opacity.opacity
      })

    const fadeOutTween = new TWEEN.Tween(opacity)
      .to({ opacity: 0 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        document.querySelector(".map_name_message").style.opacity = opacity.opacity
      })
      .onComplete(() => {
        document.querySelector(".map_name_message").style.display = "none"
      })

    fadeInTween.chain(fadeOutTween)
    fadeInTween.start()
  }

  initBlocksMenu() {
    document.querySelector(".blocks_menu").innerHTML = ""
    let buildables = Blocks.getList()

    buildables.forEach((buildable) => {
      let blockItem = this.createBlockItem(buildable)
      document.querySelector(".blocks_menu").appendChild(blockItem)
    })

    let blockItem = this.createBlockItem(-1)
    document.querySelector(".blocks_menu").appendChild(blockItem)
  }

  initPickupMenu() {
    document.querySelector(".pickups_menu").innerHTML = ""
    this.populatePickups()
  }

  populatePickups() {
    let container = document.querySelector(".pickups_menu")
    Pickups.getList().forEach((klass) => {
      let el = this.createPickupEl(klass)
      container.appendChild(el)
    })
  }

  createPickupEl(klass) {
      let imagePath = "/assets/images/" + klass.prototype.getSpritePath()
      let img = document.createElement("img")
      img.className = "pickup_entry"
      img.dataset.type = klass.prototype.getType()
      img.dataset.name = klass.prototype.getTypeName()
      img.src = imagePath
      return img
  }

  createBlockItem(buildable) {
    let type, name, spritePath

    if (buildable === -1) {
      type = -1
      name = "Cancel"
      spritePath = "backgrounds/no_select_icon.png"
    } else {
      type = buildable.prototype.getType()
      name = buildable.prototype.getTypeName()
      spritePath = buildable.prototype.getDisplaySpritePath()
    }

    let div = document.createElement("div")
    div.classList.add("block")
    div.dataset.type = type
    div.dataset.name = name

    let img = document.createElement("img")
    img.src = "/assets/images/" + spritePath
    div.appendChild(img)

    return div
  }

  onRoundStart(data) {
    document.querySelector(".round_end_modal").style.display = "none"
    this.showRound(data.round)

    this.soundManager.playGameBackgroundMusic()
  }

  onRoundEnd(data) {
    if (data.isFinal) {
      this.renderLeaderboard(data)
      
      this.showWaitCountdown(3)
    } else {
      document.querySelector(".round_end_modal").style.display = "block"
      document.querySelector(".round_end_modal .scores").innerHTML = ""

      for (let name in data.scores) {
        let score = data.scores[name]
        this.createRoundScore(name, score)
      }
    }
  }

  showWaitCountdown(countdown, cb) {
    if (this.joinNewGameInterval) {
      clearInterval(this.joinNewGameInterval)
    }

    this.joinNewGameInterval = setInterval(() => {
      countdown -= 1
      document.querySelector(".next_round_remaining").innerText = Helper.stringifyTimeShort(countdown)
      if (countdown === 0) {
        clearInterval(this.joinNewGameInterval)
        if (cb) cb()
      }
    }, 1000)
  }

  initOutlineFilter() {
    this.outlineFilter = new PIXI.filters.OutlineFilter(2)
  }

  getPlayerArmatureFactory() {
    if (!this.playerArmatureFactory) {
      const factory = dragonBones.PixiFactory.factory
      factory.parseDragonBonesData(
        this.app.loader.resources[`/assets/dragonbones/${this.getDragonBonesProjectName()}_ske.json`].data
      )
      factory.parseTextureAtlasData(
        this.app.loader.resources[`/assets/dragonbones/${this.getDragonBonesProjectName()}_tex.json`].data,
        this.app.loader.resources[`/assets/dragonbones/${this.getDragonBonesProjectName()}_tex.png`].texture
      )

      this.playerArmatureFactory = factory
    }

    return this.playerArmatureFactory
  }

  onOtherPlayerJoined(data) {
    if (!this.players[data.player.id]) {
      new Player(this, data.player)
    }
  }

  updateGame() {
    this.destroyOldDebugGraphics()

    this.applyMyInputs()
    this.interpolateEntities()

    this.animationManager.update(this.lastFrameTime)

    TWEEN.update()

    this.lastFrameTime = new Date().getTime()
  }

  handlePlaceBlock() {
    if (!this.buildBlock) return

    const gridCoord = this.buildBlock.getGridCoord()

    let sameGridCoord =
      this.lastGridCoord && this.lastGridCoord.row === gridCoord.row && this.lastGridCoord.col === gridCoord.col
    if (sameGridCoord) return

    this.lastGridCoord = gridCoord

    let data = {
      type: this.buildBlock.getType(),
      x: this.buildBlock.getX(),
      y: this.buildBlock.getY(),
      w: this.buildBlock.getWidth(),
      h: this.buildBlock.getHeight(),
    }

    if (this.buildBlock.isGround()) {
      data.color = this.blockColor
    }

    if (this.buildBlock.isWall()) {
      data.color = this.wallColor
    }

    SocketUtil.emit("Build", data)
  }

  getProtocolDirection(direction) {
    if (!direction) return Protocol.definition().DirectionType.None
    return Protocol.definition().DirectionType[Helper.capitalize(direction)]
  }

  applyMyInputs() {
    if (!window.player) return
    if (window.player.isDead()) return

    // check what keys are held
    const controlKeys = this.inputController.controlKeys
    const moveDirection = this.inputController.moveDirection
    const idle = this.inputController.idle

    if (controlKeys & Constants.Control.enter) {
      player.performAction()
      this.handlePlaceBlock()
    }

    if (this.isInputSameAsPrevious(controlKeys, moveDirection, idle)) return

    if (this.main.isMobile) {
      this.sendPlayerInput({ direction: this.getProtocolDirection(moveDirection), idle: idle })
    } else if (controlKeys >= 0) {
      const input = {
        controlKeys: controlKeys,
      }

      this.sendPlayerInput(input)
    }

    this.lastControlKeys = controlKeys
    this.lastMoveDirection = moveDirection
    this.lastIdle = idle
  }

  isInputSameAsPrevious(controlKeys, moveDirection, idle) {
    if (this.main.isMobile) {
      return this.lastMoveDirection === moveDirection && this.lastIdle === idle
    } else {
      return this.lastControlKeys === controlKeys
    }
  }

  destroyOldDebugGraphics() {
    if (!debugMode) return

    let numServerFramesToRender = 10

    for (let id in this.debugGraphics) {
      let data = this.debugGraphics[id]
      let graphics = data.graphics

      let isOldGraphics = data.timestamp < this.serverTimestamp - numServerFramesToRender

      if (isOldGraphics) {
        graphics.parent.removeChild(graphics)
        graphics.destroy()
        delete this.debugGraphics[id]
      }
    }
  }

  interpolateEntities() {
    for (let id in this.players) {
      let targetPlayer = this.players[id]
      targetPlayer.interpolate(this.lastFrameTime)
    }

    for (let id in this.projectiles) {
      let targetProjectile = this.projectiles[id]
      targetProjectile.interpolate(this.lastFrameTime)
    }

    for (let id in this.mobs) {
      let targetProjectile = this.mobs[id]
      targetProjectile.interpolate(this.lastFrameTime)
    }

    for (let id in this.movingObjects) {
      let movingObject = this.movingObjects[id]
      movingObject.interpolate(this.lastFrameTime)
    }
  }

  getAveragePingLastThreeSeconds() {}

  getInterpolationDelay() {
    // 300ms is the max render delay we are willing to tolerate
    if (this.getAveragePingLastThreeSeconds() < 100) {
      return 100
    } else if (this.getAveragePingLastThreeSeconds() < 200) {
      return 200
    } else if (this.getAveragePingLastThreeSeconds() < 300) {
      return 300
    }
  }

  goToHomepage() {
    this.isInRoom = false
    document.querySelector("html").style.backgroundColor = "#222"
    document.body.classList.remove("editor")
    this.main.showPage("home_page")
    this.stopAllBackgroundMusic()
    this.removePreviousData()

    this.displayHomeCharacter()
  }

  exitLobby() {
    document.querySelector(".browse_game_menu").style.display = "none"
    document.querySelector(".game_lobby_menu").style.display = "none"
  }

  extractImageFromGameCanvas() {
    let renderTexture = PIXI.RenderTexture.create(game_canvas.width, game_canvas.height)
    this.app.renderer.render(this.app.stage, renderTexture)
    let screenshot = this.app.renderer.plugins.extract.image(renderTexture)
    renderTexture.destroy(true)
    return screenshot
  }

  hideUnits(cb) {
    if (this.buildBlock) {
      this.buildBlock.sprite.alpha = 0
    }
    
    this.unitsContainer.alpha = 0
    cb()
    this.unitsContainer.alpha = 1

    if (this.buildBlock) {
      this.buildBlock.sprite.alpha = 0.2
    }
  }

  screenshot(cb) {
    let thumbnailCanvas = document.createElement("canvas")

    this.hideUnits(() => {
      let screenshot = this.extractImageFromGameCanvas()
      screenshot.onload = () => {
        let context = thumbnailCanvas.getContext("2d")
        thumbnailCanvas.width = 250
        thumbnailCanvas.height = 140
        context.drawImage(screenshot, 0, 0, 250, 140)
        let thumbnail = thumbnailCanvas.toDataURL("image/jpeg")
        cb(thumbnail)
      }
    })
  }

  exitLevelEditor() {
    SocketUtil.emit("LevelEditor", { action: "exit" })
  }

  updateThumbnailOnServer(cb) {
    this.screenshot((dataUrl) => {
      SocketUtil.emit("UpdateThumbnail", { thumbnail: dataUrl })
      if (cb) cb()
    })
  }

  extractDataUrl() {}

  cropImage(image, width, height, cb) {
    let canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext("2d")
    let frameWidth = width
    let frameHeight = height
    let sx = (window.innerWidth - frameWidth) / 2
    if (sx < 0) sx = 0

    let sy = (window.innerHeight - frameHeight) / 2
    if (sy < 0) sy = 0

    let sw = frameWidth
    let sh = frameHeight

    let dx = 0
    let dy = 0
    let dw = frameWidth
    let dh = frameHeight

    image.onload = function () {
      ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
      cb(canvas.toDataURL())
    }
  }

  resumeGame() {
    let data = {
      sessionId: this.main.sessionId,
    }

    SocketUtil.emit("ResumeGame", data)
  }

  onSessionResume(data) {
    if (data.success) {
      this.gameConnection.onSessionResume()
    } else {
      this.gameConnection.onSessionResumeFailed()
    }
  }

  setBackgroundColor(backgroundColor) {
    this.backgroundColor = backgroundColor
    this.backgroundContainer.tint = ClientHelper.hexToInt(backgroundColor)
  }

  setAllowedPickupTypes(allowedPickupTypes) {
    this.allowedPickupTypes = allowedPickupTypes
    this.updateEditorPickupMenu()
  }

  updateEditorPickupMenu() {
    Array.from(document.querySelectorAll(".level_editor_menu .pickups_menu .pickup_entry")).forEach((el) => {
      let type = parseInt(el.dataset.type)
      if (this.allowedPickupTypes.indexOf(type) !== -1) {
        el.classList.add("selected")
      } else {
        el.classList.remove("selected")
      }
    })
  }

  initMap(mapData) {
    this.mapName = mapData.name
    this.mapCreator = mapData.creator

    document.querySelector(".level_editor_menu .map_name_value").innerText = this.mapName

    this.setBackgroundColor(mapData.backgroundColor)
    this.setAllowedPickupTypes(mapData.allowedPickupTypes)

    for (let id in mapData.staticObjects) {
      let data = mapData.staticObjects[id]

      // don't display in game
      if (!this.isLevelEditor) {
        if (data.type === Protocol.definition().BlockType.SpawnPoint) continue
        if (data.type === Protocol.definition().BlockType.MobSpawner) continue
      }

      let blockKlass = Blocks.forType(data.type)
      if (blockKlass) {
        blockKlass.build(this, data)
      }
      
    }

    for (let id in mapData.pickups) {
      let data = mapData.pickups[id]
      this.syncEntity(data, "pickups")
    }

    for (let id in mapData.players) {
      let data = mapData.players[id]
      let player = new Player(this, data)
      if (player.isMe()) {
        this.initMyPlayer(player)
      }
    }

    this.isMapDirty = false
  }

  initMyPlayer(player) {
    window.player = this.player = player
    this.inputController.setPlayer(player)
  }

  onAFK() {
    this.isAFK = true
  }

  onPong() {}

  onCantJoin(data) {
    this.main.onPlayerCantJoin({ message: data.message })
  }

  screenShake() {
    if (this.screenShakeTween) return

    let targetSprite = this.app.stage
    let origY = targetSprite.position.y
    let position = { y: origY }
    let quakeMagnitude = 5

    this.screenShakeTween = new TWEEN.Tween(position).to({ y: origY + quakeMagnitude }, 20).onUpdate(() => {
      // Called after tween.js updates 'coords'.
      targetSprite.position.y = position.y
    })

    let bTween = new TWEEN.Tween(position).to({ y: origY - quakeMagnitude }, 20).onUpdate(() => {
      // Called after tween.js updates 'coords'.
      targetSprite.position.y = position.y
    })

    let cTween = new TWEEN.Tween(position).to({ y: origY + quakeMagnitude }, 20).onUpdate(() => {
      // Called after tween.js updates 'coords'.
      targetSprite.position.y = position.y
    })

    let dTween = new TWEEN.Tween(position).to({ y: origY - quakeMagnitude }, 20).onUpdate(() => {
      // Called after tween.js updates 'coords'.
      targetSprite.position.y = position.y
    })

    let eTween = new TWEEN.Tween(position).to({ y: origY + quakeMagnitude }, 20).onUpdate(() => {
      // Called after tween.js updates 'coords'.
      targetSprite.position.y = position.y
    })

    let fTween = new TWEEN.Tween(position)
      .to({ y: origY - quakeMagnitude }, 20)
      .onUpdate(() => {
        // Called after tween.js updates 'coords'.
        targetSprite.position.y = position.y
      })
      .onComplete(() => {
        targetSprite.position.y = origY
        this.screenShakeTween = null
      })

    this.screenShakeTween.chain(bTween)
    bTween.chain(cTween)
    cTween.chain(dTween)
    dTween.chain(eTween)
    eTween.chain(fTween)

    this.screenShakeTween.start()
  }

  onPlaySound(data) {
    let soundName = Protocol.definition().SoundType[data.id]
    let options = {
      loop: data.loop,
    }

    if (data.requestStop) {
      this.soundManager.stopSound(this.camelToSnakeCase(soundName))
    } else {
      this.soundManager.playSound(this.camelToSnakeCase(soundName), options)
    }
  }

  playSound(soundName) {
    this.soundManager.playSound(soundName)
  }

  onPlayAnimation(data) {
    let entity = this.getEntity(data.entityId)
    if (!entity) return

    entity.playCustomAnimation(data)
  }

  camelToSnakeCase(str) {
    var result = str.replace(/([A-Z])/g, " $1")
    result = result.split(" ").join("_").toLowerCase()
    if (result[0] === "_") result = result.substring(1)
    return result
  }

  onGameState(data) {
    this.serverTimestamp = data.timestamp

    for (let id in data.players) {
      let player = data.players[id]
      this.syncEntity(player, "players")
    }

    for (let id in data.mobs) {
      let mob = data.mobs[id]
      this.syncEntity(mob, "mobs")
    }

    for (let id in data.projectiles) {
      let projectile = data.projectiles[id]
      this.syncEntity(projectile, "projectiles")
    }

    for (let id in data.movingObjects) {
      let object = data.movingObjects[id]
      this.syncEntity(object, "blocks")
    }

    this.removeStalePlayers(data)
    this.removeStaleProjectiles(data)
    this.removeStaleMobs(data)

    this.renderTickDuration(data)
    this.renderMemory(data)
    this.performanceMonitor.recordUpstreamRate()
    this.performanceMonitor.recordPlayerInputTime()

    this.performanceMonitor.draw()
  }

  // assuming server sends all state every tick
  removeStalePlayers(data) {
    for (let id in this.players) {
      let isInServer = data.players[id]
      if (!isInServer) {
        this.players[id].remove()
      }
    }
  }

  // assuming server sends all state every tick
  removeStaleProjectiles(data) {
    for (let id in this.projectiles) {
      let isInServer = data.projectiles[id]
      if (!isInServer) {
        this.projectiles[id].remove()
      }
    }
  }

  // assuming server sends all state every tick
  removeStaleMobs(data) {
    for (let id in this.mobs) {
      let isInServer = data.mobs[id]
      if (!isInServer) {
        this.mobs[id].remove()
      }
    }
  }

  onBlock(data) {
    this.syncEntity(data, "blocks")
    this.isMapDirty = true
  }

  onPickupEntry(data) {
    this.setAllowedPickupTypes(data.allowedPickupTypes)
    this.isMapDirty = true
  }

  onProjectile(data) {
    this.syncEntity(data, "projectiles")
  }

  onPickup(data) {
    this.syncEntity(data, "pickups")
  }

  onPlayer(data) {
    this.syncEntity(data, "players")
  }

  syncEntity(data, group) {
    let entity = this.getEntity(data.id)

    if (!entity && !data.clientMustDelete) {
      entity = this.createEntity(data, group)
    }

    if (!entity) return

    if (data.clientMustDelete) {
      entity.remove(data)
    } else {
      entity.syncWithServer(data)
    }
  }

  createEntity(data, group) {
    let entity

    switch (group) {
      case "players":
        entity = new Player(this, data)
        break
      case "projectiles":
        entity = Projectiles.forType(data.type).build(this, data)
        break
      case "pickups":
        let pickupKlass = Pickups.forType(data.type)
        if (pickupKlass) {
          entity = pickupKlass.build(this, data)
        }
        break
      case "blocks":
        entity = Blocks.forType(data.type).build(this, data)
        break
      case "mobs":
        entity = Mobs.forType(data.type).build(this, data)
        break
      default:
        entity = null
    }

    return entity
  }

  getEntity(id) {
    return this.entities[id]
  }

  registerGlobalEntity(entity) {
    this.entities[entity.id] = entity
  }

  unregisterGlobalEntity(entity) {
    delete this.entities[entity.id]
  }

  setGameConnection(gameConnection) {
    this.gameConnection = gameConnection
    this.reinitConnection()

    this.gameConnection.setGame(this)

    this.keepConnectionAlive()
  }

  keepConnectionAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
    }

    this.keepAliveInterval = setInterval(() => {
      SocketUtil.emit("Ping", {})
    }, 1000 * 30)
  }

  reinitConnection() {
    SocketUtil.setSocket(this.gameConnection.socket)
  }

  trackPing() {
    if (!this.measurePingInterval) {
      this.measurePingInterval = setInterval(this.calculatePing.bind(this), 3000)
    }
  }

  calculatePing() {
    this.pingTime = new Date().getTime()
    SocketUtil.emit("Ping", {})
  }

  onPong() {
    let pongTime = new Date().getTime()
    let ping = pongTime - this.pingTime

    let pingEl = document.querySelector("#performance_stats #ping .value")
    if (pingEl) {
      pingEl.innerText = ping + " ms"
    }

    if (!isNaN(ping)) {
      document.querySelector(".ping_display").innerText = ping + " ms"
    }
  }

  getServerUpdateRateMultiplier() {
    return 1
  }

  renderTickDuration(data) {
    if (!data.hasOwnProperty("tick")) return
    document.querySelector("#performance_stats #tick .value").innerText = data.tick + " ms"
  }

  renderMemory(data) {
    if (!data.hasOwnProperty("memory")) return
    document.querySelector("#performance_stats #server_memory .value").innerText = data.memory + " MB"
  }

  togglePerformanceDebug() {
    this.performanceMonitor.toggle()
  }

  zoom(targetScale) {
    if (!this.isZoomEnabled) return

    let scale = { scale: this.app.stage.scale }

    this.isZoomEnabled = false // dont allow another zoom until this one is finished

    new TWEEN.Tween(scale)
      .to({ scale: targetScale  }, 300)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        this.app.stage.scale.set(scale.scale, -scale.scale)
      })
      .onComplete(() => {
        this.isZoomEnabled = true
      })
      .start()
  }

  zoomAndCenter(entity, targetScale) {
    if (!this.isZoomEnabled) return

    let targetPos = this.getCameraCenterPos(entity, targetScale)
    let stage = this.app.stage

    let curr = { scale: stage.scale.x, x: stage.position.x, y: stage.position.y }
    let to   = { scale: targetScale,   x: targetPos.x,      y: targetPos.y }


    this.isZoomEnabled = false // dont allow another zoom until this one is finished

    new TWEEN.Tween(curr)
      .to(to, 300)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        stage.scale.set(curr.scale, -curr.scale)
        stage.position.x = curr.x
        stage.position.y = curr.y
      })
      .onComplete(() => {
        this.isZoomEnabled = true
      })
      .start()
  }

  centerCameraTo(entity) {
    let pos = getCameraCenterPos(entity)
    this.app.stage.position.x = pos.x
    this.app.stage.position.y = pos.y
  }

  getCameraCenterPos(entity, scale = this.app.stage.scale.x) {
    let x = entity.getX()
    let y = entity.getY()

    let browserResolution = this.getPixelRatio()

    const displacementX = (x * scale) - ((this.getCameraWidth() * browserResolution) / 2)
    const displacementY = (y * scale) - ((this.getCameraHeight() * browserResolution) / 2)

    return {
      x: -displacementX,
      y: displacementY + this.getStageYOffset()
    } 
  }



}

module.exports = Game
