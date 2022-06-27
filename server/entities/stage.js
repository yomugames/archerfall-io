const SocketUtil = require("../util/socket_util")
const AiBot = require("./ai_bot")
const fs = require("fs")
const path = require("path")
const SAT = require("sat")
const Blocks = require("./blocks/index")
const Grid = require("../../common/entities/grid")
const Constants = require("../../common/constants.json")
const Pickups = require("./pickups/index")
const Protocol = require("../../common/util/protocol")
const Projectiles = require("./projectiles/index")
const Mobs = require("./mobs/index")
const LevelMap = require("./level_map")
const FloodFillManager = require("./flood_fill_manager")
const ExceptionReporter = require("../util/exception_reporter")
const LevelModel = require("archerfall-common/db/level")
const RankingModel = require("archerfall-common/db/ranking")
const User = require("archerfall-common/db/user")
const PlayerBot = require("./player_bot")
const CollisionHandler = require("../collisions/collision_handler")

class Stage {
  constructor(game, map) {
    this.game = game
    this.map = map
    this.init()
  }

  init() {
    this.MIN_PLAYERS = 4
    this.NUM_TOTAL_ROUNDS = 3
    this.NUM_TILES_PADDED_ON_SIDE = 3
    this.STAGE_HEIGHT = 800
    this.shouldTriggerRounds = false
    this.isRoundStarted = false
    this.lastBotAddedTime = Date.now()

    this.temporaries = {}
    this.staticObjects = {}
    this.movingObjects = {}
    this.processors = {}
    this.players = {}
    this.projectiles = {}
    this.pickups = {}
    this.mobs = {}
    this.pickupLocations = []
    this.spawnPoints = {}
    this.usedSpawnPoints = {}
    this.mobSpawners = {}
    this.explosionQueue = {}
    this.destroyedObjects = []
    this.boundaries = []

    this.TIME_LIMIT_SECONDS = 15
    this.roundStartTimestamp = this.game.timestamp

    this.scores = {}
    this.round = 1
    this.isPrivate = false

    this.tickRate = Constants.physicsTimeStep

    this.collisionHandler = new CollisionHandler(this)

    this.newBotAddInterval()
  }

  stopAndRemovePlayers() {
    this.forEachPlayer((player) => {
      this.removePlayer(player)
    })

    this.cleanup()

    this.setIsRoundStarted(false)
    this.shouldTriggerRounds = false
    this.round = 1
  }

  setName(name) {
    if (this.game.isBadWord(name)) return

    this.name = name

    this.onMapChanged()
  }

  onMapChanged() {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "MapData", this.getMapJson())
    })
  }

  addProcessor(entity) {
    this.processors[entity.id] = entity
  }

  removeProcessor(entity) {
    delete this.processors[entity.id]
  }

  setTickRate(tickRate) {
    this.tickRate = tickRate

    this.broadcastEvent("GameUpdated", { tickRate: this.tickRate })
  }

  newBotAddInterval() {
    this.botAddInterval = 100 + Math.floor(Math.random() * 200)
  }

  addMovingObject(object) {
    this.movingObjects[object.getId()] = object
  }

  removeMovingObject(object) {
    delete this.movingObjects[object.getId()]
  }

  initWorld() {
    this.gravity = new SAT.Vector(0, Constants.gravity)
    this.groundMap = new Grid("ground", this, this.getRowCount(), this.getColCount())
    this.pickupMap = new Grid("pickup", this, this.getRowCount(), this.getColCount())

    this.floodFillManager = new FloodFillManager(this, this.groundMap)
  }

  floodFill(options = {}) {
    return this.floodFillManager.floodFill(options)
  }

  queueExplosions(explosions) {
    explosions.forEach((explosion) => {
      this.explosionQueue[explosion.timestamp] = this.explosionQueue[explosion.timestamp] || []
      this.explosionQueue[explosion.timestamp].push(explosion)
    })
  }

  processExplosionQueue() {
    try {
      let explosions = this.explosionQueue[this.game.timestamp]
      if (!explosions) return

      explosions.forEach((explosion) => {
        let klass = Projectiles.forType(explosion.type)
        this.createExplosion(klass, explosion.row, explosion.col, explosion.shooter)
      })
    } catch (e) {
      ExceptionReporter.captureException(e)
    }

    delete this.explosionQueue[this.game.timestamp]
  }

  createExplosion(klass, row, col, shooter) {
    let x = col * Constants.tileSize + Constants.tileSize / 2
    let y = row * Constants.tileSize + Constants.tileSize / 2

    klass.build(this, {
      position: { x: x, y: y },
      rotation: 0,
      shooter: shooter,
    })
  }

  getCameraRowCount() {
    return this.rowCount
  }

  getCameraColCount() {
    return this.colCount
  }

  getRowCount() {
    return this.getCameraRowCount() + this.NUM_TILES_PADDED_ON_SIDE * 2
  }

  getColCount() {
    return this.getCameraColCount() + this.NUM_TILES_PADDED_ON_SIDE * 2
  }

  createProjectile(klassName, data) {
    let klass = Projectiles[klassName]
    if (!klass) return

    klass.build(this, data)
  }

  addClosingBoundaries() {
    const y = this.getGameHeight() / 2
    const width = this.getCameraWidth() / 2
    const height = this.getGameHeight()

    const leftBoundaryOptions = {
      direction: "right",
      x: this.getCameraDisplacement() - this.getCameraWidth() / 4,
      y,
      width,
      height,
    }

    const rightBoundaryOptions = {
      direction: "left",
      x: this.getCameraDisplacement() + this.getCameraWidth() + this.getCameraWidth() / 4,
      y,
      width,
      height,
    }

    const leftBoundary = new Blocks.Boundary(this, leftBoundaryOptions)
    const rightBoundary = new Blocks.Boundary(this, rightBoundaryOptions)
    this.boundaries = [leftBoundary, rightBoundary]
  }

  getBoundaries() {
    return this.boundaries
  }

  importMap(mapData) {
    this.setupMap(mapData)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyUpdated", {
        thumbnail: this.thumbnail,
      })

      SocketUtil.emit(player.socket, "MapData", this.getMapJson())
    })
  }

  ensureLevelSetup(cb) {
    if (this.isLevelLoaded) {
      cb()
      return
    }

    this.setupMap(this.map.data)
    this.isLevelLoaded = true
    cb()
  }

  getName() {
    return this.map.data.name
  }

  setupMap(mapData) {
    // ensure we're doing a deep copy and not modify existing state
    let json = JSON.parse(JSON.stringify(mapData))

    this.name = json.name || ""
    this.MIN_ROW_COUNT = 20
    this.MIN_COL_COUNT = 34
    this.DEFAULT_ROW_COUNT = 24
    this.DEFAULT_COL_COUNT = 42
    this.rowCount = Math.max(this.MIN_ROW_COUNT, json.rowCount || this.DEFAULT_ROW_COUNT)
    this.colCount = Math.max(this.MIN_COL_COUNT, json.colCount || this.DEFAULT_COL_COUNT)
    this.foregroundColor = json.foregroundColor || "#555555"
    this.wallColor = json.wallColor || "#5e472e"
    this.backgroundColor = json.backgroundColor || "#222222"
    this.shouldEditorSimulate = json.shouldEditorSimulate || false
    this.thumbnail = json.thumbnail

    if (mapData.allowedPickupTypes) {
      this.allowedPickupSet = new Set(mapData.allowedPickupTypes)
    } else {
      this.allowedPickupSet = this.createAllPickupSet()
    }

    this.initWorld()

    if (json.spawnPoints) {
      json.spawnPoints.forEach((block) => {
        this.initSpawnPoint(block)
      })
    }

    if (json.mobSpawners) {
      json.mobSpawners.forEach((block) => {
        this.initMobSpawner(block)
      })
    }

    if (json.blocks) {
      json.blocks.forEach((block) => {
        this.initBlock(block)
      })
    }

    this.mirrorEdgeBlocks()
    this.determinePickupSlots()
  }

  reinit() {
    this.mirrorEdgeBlocks()
    this.determinePickupSlots()
  }

  createAllPickupSet() {
    let set = new Set()
    
    Pickups.getList().forEach((klass) => {
      set.add(klass.prototype.getType())
    })

    return set
  }

  startNewMap() {
    this.removeAllBlocks()
    this.reinit()
  }

  getFirstValidCol() {
    return (this.getColCount() - this.getCameraColCount()) / 2
  }

  getFirstValidRow() {
    return (this.getRowCount() - this.getCameraRowCount()) / 2
  }

  getLastValidCol() {
    return this.getColCount() - this.getFirstValidCol() - 1
  }

  getLastValidRow() {
    return this.getRowCount() - this.getFirstValidRow() - 1
  }

  determinePickupSlots() {
    this.pickupLocations = []

    this.groundMap.forEach((row, col, value) => {
      if (value && col >= this.getFirstValidCol() && col <= this.getLastValidCol() && row < this.getRowCount() - 2) {
        let isGroundSuitableForPickup = value.isSuitableForPickup()
        let firstTileAbove = this.groundMap.rowColHitTest(row + 1, col)
        let secondTileAbove = this.groundMap.rowColHitTest(row + 2, col)
        let emptySpaceFound = !firstTileAbove.entity && !secondTileAbove.entity
        if (isGroundSuitableForPickup && emptySpaceFound) {
          this.pickupLocations.push({ row: row + 1, col: col })
        }
      }
    })
  }

  getRandomPickupLocation() {
    let index = Math.floor(Math.random() * this.pickupLocations.length)
    return this.pickupLocations[index]
  }

  getRandomMobSpawner() {
    let spawners = Object.values(this.mobSpawners).filter((s) => !s.isSpawning)
    if (!spawners.length) return null

    let index = Math.floor(Math.random() * spawners.length)
    let spawner = spawners[index]

    return spawner
  }

  getRandomWeapon() {
    let arrowKlasses = this.getAllowedWeaponKlasses() 
    let index = Math.floor(Math.random() * arrowKlasses.length)
    return arrowKlasses[index]
  }

  getRandomPowerup() {
    let pickups = this.getAllowedPowerupKlasses() 
    let index = Math.floor(Math.random() * pickups.length)
    return pickups[index]
  }

  getAllowedWeaponKlasses() {
    let klasses = Pickups.getArrows().concat(Pickups.getMeleeWeapons())
    return klasses.filter((klass) => {
      return this.allowedPickupSet.has(klass.prototype.getType())
    })
  }

  getAllowedPowerupKlasses() {
    return Pickups.getPowerups().filter((klass) => {
      return this.allowedPickupSet.has(klass.prototype.getType())
    })
  }

  getRandomMob() {
    let mobKlasses = Mobs.getList()
    let index = Math.floor(Math.random() * mobKlasses.length)
    return mobKlasses[index]
  }

  getArrowCount() {
    return Object.values(this.pickups).filter((pickup) => {
      return pickup.isArrow()
    }).length
  }

  getPowerupCount() {
    return Object.values(this.pickups).filter((pickup) => {
      return !pickup.isArrow()
    }).length
  }

  getMobCount() {
    return Object.keys(this.mobs).length
  }

  spawnArrows() {
    if (this.game.isLevelEditor) return

    let fiveSeconds = Constants.physicsTimeStep * 5
    if (this.game.timestamp % fiveSeconds !== 0) return
    if (this.getArrowCount() >= this.getPlayerCount() * 1.5) return

    this.spawnArrow()
  }

  spawnPowerups() {
    if (this.game.isLevelEditor) return

    let interval = Constants.physicsTimeStep * 4
    if (this.game.timestamp % interval !== 0) return
    if (this.getPowerupCount() >= this.getPlayerCount() * 1.5) return

    this.spawnPowerup()
  }

  spawnMobs() {
    if (this.game.isLevelEditor) return

    if (!this.shouldSpawnMob()) return

    this.spawnMob()
  }

  shouldSpawnMob() {
    return false
    let interval = Constants.physicsTimeStep * 6
    if (this.game.timestamp % interval !== 0) return false
    if (this.getMobCount() >= this.getPlayerCount() * 1.5) return false

    return true
  }

  getProjectiles() {
    return Object.values(this.projectiles)
  }

  getPickups() {
    return Object.values(this.pickups)
  }

  getPickupCount() {
    return Object.keys(this.pickups).length
  }

  spawnArrow() {
    let location = this.getRandomPickupLocation()
    if (!location) return
    let pickup = this.getRandomWeapon()
    if (!pickup) return
    this.addPickupAt(pickup.name, location.row, location.col)
  }

  spawnPowerup() {
    let location = this.getRandomPickupLocation()
    if (!location) return

    let pickup = this.getRandomPowerup()
    if (!pickup) return
    this.addPickupAt(pickup.name, location.row, location.col)
  }

  playClientAnimation(data) {
    this.game.broadcastEvent("PlayClientAnimation", data)
  }

  spawnMob() {
    try {
      let mobSpawner = this.getRandomMobSpawner()
      if (!mobSpawner) return

      const animationDuration = 4

      this.playClientAnimation({
        loop: false,
        duration: animationDuration,
        setupData: {
          position: mobSpawner.position,
        },
        animationType: Protocol.definition().ClientAnimationType.MobPortal,
      })

      let mobKlass = this.getRandomMob()
      setTimeout(() => {
        this.spawnMobAt(mobKlass, mobSpawner.position)
      }, animationDuration * 0.7 * 1000)
    } catch (e) {
      this.game.captureException(e)
    }
  }

  spawnMobAt(mobKlass, position) {
    mobKlass.build(this, position)
  }

  addPickupAt(name, row, col) {
    if (this.isPickupTileOccupied(row, col)) return

    let tileSize = Constants.tileSize
    Pickups[name].build(this, {
      x: col * tileSize + tileSize / 2,
      y: row * tileSize + tileSize / 2,
    })
  }

  isMirrorEnabled() {
    return true
  }

  offsetBlockPosition(block) {
    block.x += Constants.tileSize * this.NUM_TILES_PADDED_ON_SIDE
    block.y += Constants.tileSize * this.NUM_TILES_PADDED_ON_SIDE
  }

  initSpawnPoint(block) {
    if (this.isMirrorEnabled()) {
      this.offsetBlockPosition(block)
    }

    this.addBlockAtPos(block.type, block)
  }

  initMobSpawner(block) {
    if (this.isMirrorEnabled()) {
      this.offsetBlockPosition(block)
    }

    this.addBlockAtPos(block.type, block)
  }

  initBlock(block) {
    if (this.isMirrorEnabled()) {
      this.offsetBlockPosition(block)
    }

    this.addBlockAtPos(block.type, block)
  }

  addIceWallAt(row, col) {
    this.buildRowCol("IceWall", row, col)
  }

  addBlockAt(type, row, col, data = {}) {
    data.x = col * Constants.tileSize + Constants.tileSize / 2
    data.y = row * Constants.tileSize + Constants.tileSize / 2

    return this.addBlockAtPos(type, data)
  }

  addBlockAtPos(type, data) {
    let typeName = Protocol.definition().BlockType[type]
    let klass = Blocks[type] || Blocks[typeName]
    if (!klass) return

    let block = new klass(this, data)
    return block
  }

  /*
    should mirror the last 3 blocks of the other side
    do it for the sides and top/bottom
  */
  mirrorEdgeBlocks() {
    for (var row = this.getFirstValidRow(); row <= this.getLastValidRow(); row++) {
      // left should mirror blocks on right edge of screen
      for (var col = 0; col < this.NUM_TILES_PADDED_ON_SIDE; col++) {
        let srcRow = row
        let srcCol = col + this.getCameraColCount()
        this.copyBlock(srcRow, srcCol, row, col)
      }

      // right should mirror blocks on left edge of screen
      for (var col = this.getLastValidCol() + 1; col < this.getColCount(); col++) {
        let srcRow = row
        let srcCol = col - this.getCameraColCount()
        this.copyBlock(srcRow, srcCol, row, col)
      }
    }

    for (var col = this.getFirstValidCol(); col <= this.getLastValidCol(); col++) {
      // bottom should mirror blocks on top edge of screen
      for (var row = 0; row < this.NUM_TILES_PADDED_ON_SIDE; row++) {
        let srcRow = row + this.getCameraRowCount()
        let srcCol = col
        this.copyBlock(srcRow, srcCol, row, col)
      }

      // // top should mirror blocks on bottom edge of screen
      for (var row = this.getLastValidRow() + 1; row < this.getRowCount(); row++) {
        let srcRow = row - this.getCameraRowCount()
        let srcCol = col
        this.copyBlock(srcRow, srcCol, row, col)
      }
    }
  }

  copyBlock(srcRow, srcCol, row, col) {
    let block = this.groundMap.get(srcRow, srcCol)
    if (!block) {
      // src block is empty, we want current to be empty as well
      this.removeBuild(row, col)
    } else {
      this.addBlockAt(block.getType(), row, col)
    }
  }

  isTileOccupied(row, col) {
    return this.groundMap.isTileOccupied(row, col)
  }

  isOccupied(x, y, width, height) {
    return this.groundMap.isOccupied(x, y, width, height)
  }

  removeBuild(row, col) {
    let entity = this.groundMap.get(row, col)
    if (entity) {
      entity.remove()
    }
  }

  removeBuildByBox(box) {
    this.groundMap.removeExisting(box)
  }

  broadcastEvent(eventName, data) {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, eventName, data)
    })
  }

  onStaticObjectUpdated(entity) {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "Block", entity)
    })
  }

  onProjectileUpdated(entity) {}

  onPickupUpdated(entity) {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "Pickup", entity)
    })
  }

  onPlayerUpdated(entity) {}

  editLevel(data) {
    if (data.backgroundColor) {
      this.backgroundColor = data.backgroundColor
    }

    if (data.foregroundColor) {
      this.foregroundColor = data.foregroundColor
    }

    if (data.wallColor) {
      this.wallColor = data.wallColor
    }

    if (data.hasOwnProperty("simulate")) {
      this.shouldEditorSimulate = data.simulate
    }

    if (data.pickupType) {
      if (data.isEnabled) {
        this.allowedPickupSet.add(data.pickupType)
      } else {
        this.allowedPickupSet.delete(data.pickupType)
      }
      this.onAllowedPickupSetChanged()
    }
  }

  onAllowedPickupSetChanged(pickupType, isEnabled) {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "PickupEntry", {
        allowedPickupTypes: this.getAllowedPickupTypes()
      })
    })
  }

  async saveMap(options = {}) {
    let userUid = options.userUid
    let thumbnail = this.thumbnail
    let isPrivate = this.isPrivate

    let result = this.exportMap()

    delete result["thumbnail"]

    let level = await LevelModel.findOne({
      where: { uid: this.map.getUid(), creatorUid: userUid },
    })

    if (level) {
      level.name = this.name
      level.data = JSON.stringify(result)
      level.thumbnail = thumbnail
      await level.save()
      this.game.server.updateMapCache(level.uid, Object.assign({}, result, {}))
    } else {
      return false
    }

    return true
  }

  getAllowedPickupTypes() {
    return Array.from(this.allowedPickupSet)
  }

  exportMap() {
    let result = {
      "name": this.name || "",
      "rowCount": this.rowCount,
      "colCount": this.colCount,
      "foregroundColor": this.foregroundColor,
      "backgroundColor": this.backgroundColor,
      "wallColor": this.wallColor,
      "spawnPoints": [],
      "mobSpawners": [],
      "blocks": [],
      "thumbnail": this.thumbnail,
      "allowedPickupTypes": this.getAllowedPickupTypes()
    }

    for (let id in this.staticObjects) {
      let entity = this.staticObjects[id]
      if (entity.isVisibleInCamera()) {
        if (entity.isSpawnPoint()) {
          result.spawnPoints.push(entity.toExportJson())
        } else if (entity.isMobSpawner()) {
          result.mobSpawners.push(entity.toExportJson())
        } else {
          result.blocks.push(entity.toExportJson())
        }
      }
    }

    // let filePath = path.resolve(__dirname, '../levels/editor.json')
    // fs.writeFileSync(filePath, JSON.stringify(result, null, 2))
    return result
  }

  buildRowCol(type, row, col, color) {
    let data = {}
    if (color) data.color = color

    let block = this.addBlockAt(type, row, col, data)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "Block", block)
    })
  }

  build(type, data) {
    let block = this.addBlockAtPos(type, data)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "Block", block)
    })
  }

  addProjectile(projectile) {
    this.projectiles[projectile.getId()] = projectile
  }

  removeProjectile(projectile) {
    delete this.projectiles[projectile.getId()]
  }

  removeAllBlocks() {
    for (let id in this.staticObjects) {
      let block = this.staticObjects[id]
      block.remove()
    }
  }

  removeAllProcessors() {
    for (let id in this.processors) {
      let processor = this.processors[id]
      processor.remove()
    }
  }

  removeAllMobs() {
    for (let id in this.mobs) {
      let mob = this.mobs[id]
      mob.remove()
    }
  }

  removeAllTemporaries() {
    for (let id in this.temporaries) {
      let temporary = this.temporaries[id]
      temporary.remove()
    }
  }

  removeAllPickups() {
    for (let id in this.pickups) {
      let pickup = this.pickups[id]
      pickup.remove()
    }
  }

  removeAllProjectiles() {
    for (let id in this.projectiles) {
      let projectile = this.projectiles[id]
      projectile.remove()
    }
  }

  addPickup(pickup) {
    this.pickups[pickup.getId()] = pickup
    this.addToPickupMap(pickup)
  }

  removePickup(pickup) {
    delete this.pickups[pickup.getId()]
    this.removeFromPickupMap(pickup)
  }

  addSpawnPoint(spawnPoint) {
    this.spawnPoints[spawnPoint.getId()] = spawnPoint
  }

  addMobSpawner(mobSpawner) {
    this.mobSpawners[mobSpawner.getId()] = mobSpawner
  }

  removeSpawnPoint(spawnPoint) {
    delete this.spawnPoints[spawnPoint.getId()]
  }

  removeMobSpawner(mobSpawner) {
    delete this.mobSpawners[mobSpawner.getId()]
  }

  addStaticObject(staticObject) {
    this.staticObjects[staticObject.getId()] = staticObject
    this.addToGroundMap(staticObject)
  }

  removeStaticObject(staticObject) {
    delete this.staticObjects[staticObject.getId()]
    this.removeFromGroundMap(staticObject)
  }

  assignPlayerPosition(player) {
    let spawnPoint = this.findSpawnPoint()
    player.setPosition(spawnPoint.x, spawnPoint.y)
  }

  detectUnitCollisions(options) {
    return this.collisionHandler.detectUnitCollisions(options)
  }

  detectPlayerCollisions(options) {
    return this.collisionHandler.detectPlayerCollisions(options)
  }

  isAABBIntersect(box, otherBox) {
    return this.collisionHandler.isAABBIntersect(box, otherBox)
  }

  onPlayerAdded(player) {
    this.scores[player.getId()] = 0

    this.assignPlayerPosition(player)

    if (!player.isBot()) {
      if (!this.firstPlayerJoinTime) {
        this.firstPlayerJoinTime = Date.now()
      }
    }

    if (this.getPlayerCount() >= this.MIN_PLAYERS) {
      this.onStageHasEnoughPlayers()
    }

    this.broadcastPlayerJoin(player)

    player.onAddedToStage()
  }

  onPlayerDie(victim, killer) {
    if (this.getAlivePlayerCount() <= 1) {
      this.endRound()
    }
  }

  getRankings() {
    let playerList = this.getPlayerList()
    let rankings = playerList.map((player) => {
      let ranking = {}
      ranking.playerId = player.getId()
      ranking.name = player.getName()
      ranking.score = this.scores[player.getId()]

      return ranking
    })

    rankings = rankings.sort((a, b) => {
      return b.score - a.score
    })

    let rank = 1
    rankings.forEach((ranking) => {
      ranking.rank = rank
      rank += 1
    })

    return rankings
  }

  getScoresByName() {
    let result = {}

    for (let id in this.scores) {
      let score = this.scores[id]
      let player = this.players[id]
      if (player) {
        result[player.getName()] = score
      }
    }

    return result
  }

  addScoreToLastManStanding() {
    this.forEachPlayer((player) => {
      if (player.isAlive()) {
        this.incrementScore(player)
      }
    })
  }

  endRound() {
    this.addScoreToLastManStanding()
    this.cleanup()

    if (this.isFinal()) {
      this.onFinalRoundEnded()
    } else {
      this.onInnerRoundEnded()
    }

    this.setIsRoundStarted(false)

    this.round += 1
  }

  onInnerRoundEnded() {
    this.broadcastEvent("RoundEnd", {
      scores: this.getScoresByName(),
      isFinal: false,
    })
    this.nextRoundTimestamp = this.game.timestamp + Constants.physicsTimeStep * 2
  }

  onFinalRoundEnded() {
    let winner = this.getHighestScorePlayer()
    let rankings = this.getRankings()

    this.broadcastEvent("RoundEnd", {
      winner: winner.name,
      scores: this.getScoresByName(),
      rankings: rankings,
      isFinal: true,
    })

    this.round = 0
    this.nextRoundTimestamp = this.game.timestamp + Constants.physicsTimeStep * 3
    this.resetScores()

    if (this.game.isCustomGame()) {
      this.shouldKickPlayersNextRound = true
    }

    this.shouldTriggerRounds = false

    if (this.shouldSaveToLeaderboard()) {
      this.savePlayerStats(rankings)
    }

    this.stopAndRemovePlayers()

    if (!this.game.isCustomGame()) {
      this.game.queuePlayersForNextStage()
    }
  }

  shouldSaveToLeaderboard() {
    return this.getHumanPlayerCount() > 1
  }

  getHumanPlayerCount() {
    return Object.values(this.players).filter((player) => {
      return !player.isBot()
    }).length
  }

  async savePlayerStats(rankings) {
    for (let i = 0; i < rankings.length; i++) {
      let ranking = rankings[i]
      let player = this.players[ranking.playerId]
      if (player && player.isLoggedIn()) {
        let firstPlace = ranking.rank === 1
        if (firstPlace) {
          await this.updatePlayerRanking(player, { playCount: 1, winCount: 1 })
        } else {
          await this.updatePlayerRanking(player, { playCount: 1 })
        }
      }
    }
  }

  getGameMode() {
    return "arena"
  }

  async updatePlayerRanking(player, stats) {
    let baseAttributes = {
      gameMode: this.getGameMode(),
      userUid: player.getUid(),
    }

    const rankingRow = await RankingModel.findOne({
      where: baseAttributes,
    })

    if (!rankingRow) {
      RankingModel.createOne(Object.assign({}, baseAttributes, stats))
    } else {
      for (let key in stats) {
        let value = stats[key]
        rankingRow[key] += value
      }

      rankingRow.save()
    }
  }

  incrementScore(player) {
    this.scores[player.getId()] += 1
  }

  resetScores() {
    for (let id in this.scores) {
      this.scores[id] = 0
    }
  }

  isFinal() {
    return Object.values(this.scores).find((score) => {
      return score >= this.NUM_TOTAL_ROUNDS
    })
  }

  getHighestScorePlayer() {
    let list = []
    for (let id in this.scores) {
      let score = this.scores[id]
      let player = this.players[id]
      if (player) {
        list.push({
          name: player.getName(),
          score: score,
        })
      }
    }

    let first = list.sort((a, b) => {
      return b.score - a.score
    })[0]

    return first
  }

  getAlivePlayer() {
    return Object.values(this.players).find((player) => {
      return player.isAlive()
    })
  }

  getAlivePlayerCount() {
    return Object.values(this.players).filter((player) => {
      return player.isAlive()
    }).length
  }

  broadcastPlayerJoin(targetPlayer) {
    this.forEachPlayer((player) => {
      if (player !== targetPlayer) {
        SocketUtil.emit(player.getSocket(), "OtherPlayerJoined", { player: targetPlayer })
      }
    })
  }

  onStageHasEnoughPlayers() {
    if (this.isRoundStarted) return

    this.startRound()
  }

  cleanup() {
    this.usedSpawnPoints = {}
    this.explosionQueue = {}

    this.removeAllPickups()
    this.removeAllProjectiles()
    this.removeAllProcessors()
    this.removeAllMobs()
    this.removeAllTemporaries()
    this.restoreDestroyedObjects()

    if (this.isTimeSlowed()) {
      this.stopSlowMotion()
    }
  }

  addDestroyedObjects(destroyedObject) {
    this.destroyedObjects.push(destroyedObject.toJson())
  }

  restoreDestroyedObjects() {
    try {
      this.destroyedObjects.forEach((block) => {
        this.build(block.type, block)
      })

      this.destroyedObjects = []
    } catch (e) {
      this.game.captureException(e)
    }
  }

  startRound() {
    this.shouldTriggerRounds = true
    this.shouldKickPlayersNextRound = false
    this.setIsRoundStarted(true)
    this.roundStartTimestamp = this.game.timestamp
    this.isTimeLimitReached = false
    this.cleanup()
    this.resurrectAndPositionPlayers()
    this.spawnInitialPickupsPowerups()

    this.forEachHumanPlayer((player) => {
      player.addGhost()
      SocketUtil.emit(player.socket, "RoundStart", { round: this.round })
    })
  }

  spawnInitialPickupsPowerups() {
    let count = 1
    for (let i = 0; i < count; i++) {
      this.spawnPowerup()
      this.spawnArrow()
    }
  }

  getUnusedSpawnPoint() {
    let spawnPoint

    for (let id in this.spawnPoints) {
      if (!this.usedSpawnPoints[id]) {
        spawnPoint = this.spawnPoints[id]
        break
      }
    }

    if (!spawnPoint) return null

    this.usedSpawnPoints[spawnPoint.getId()] = true

    return spawnPoint
  }

  resurrectAndPositionPlayers(options = {}) {
    let playerList = Object.values(this.players)
    playerList.forEach((player) => {
      player.resurrect(options)
      let spawnPoint = this.findSpawnPoint()
      player.setPosition(spawnPoint.x, spawnPoint.y)
    })
  }

  findSpawnPoint() {
    let spawnPoint = this.getUnusedSpawnPoint()
    if (spawnPoint) {
      return {
        x: spawnPoint.getX(),
        y: spawnPoint.getY(),
      }
    }

    let location = this.getRandomPickupLocation()
    if (location) {
      return {
        x: location.col * Constants.tileSize,
        y: location.row * Constants.tileSize,
      }
    }

    return {
      x: 10 * Constants.tileSize,
      y: 10 * Constants.tileSize,
    }
  }

  addTemporary(entity) {
    this.temporaries[entity.getId()] = entity
  }

  removeTemporary(entity) {
    delete this.temporaries[entity.getId()]
  }

  addPlayer(player) {
    this.newPlayerJoinTimestamp = this.game.timestamp

    player.stage = this
    this.players[player.getId()] = player

    this.onPlayerAdded(player)
  }

  hasPlayer(player) {
    return this.players[player.getId()]
  }

  removePlayer(player) {
    player.stage = null
    delete this.players[player.getId()]
    delete this.scores[player.getId()]
  }

  remove() {
    this.removeBots()
  }

  onPlayerCountChanged() {}

  addMob(mob) {
    this.mobs[mob.getId()] = mob
  }

  removeMob(mob) {
    delete this.mobs[mob.getId()]
  }

  isTimeSlowed() {
    return this.tickRate < Constants.physicsTimeStep
  }

  setThumbnail(thumbnail) {
    this.thumbnail = thumbnail
  }

  startSlowMotion() {
    let duration = 6
    this.setTickRate(Constants.physicsTimeStep / 2)

    this.slowMotionStopTimestamp = this.game.timestamp + Constants.physicsTimeStep * duration
  }

  stopSlowMotion() {
    this.setTickRate(Constants.physicsTimeStep)
  }

  onTimeLimitReached() {
    if (this.isTimeLimitReached) return
    this.isTimeLimitReached = true

    this.addClosingBoundaries()
  }

  autoStartRounds() {
    this.shouldTriggerRounds = true
  }

  setIsRoundStarted(isRoundStarted) {
    this.isRoundStarted = isRoundStarted
    this.onRoundChanged()
  }

  onRoundChanged() {
    this.game.server.matchmakerClient.sendServerInfoToMatchmaker()
  }

  handleTimeLimit() {
    if (!this.game.isLevelEditor) {
      let isTimeLimitReached = this.getRoundTimestamp() > Constants.physicsTimeStep * this.TIME_LIMIT_SECONDS
      if (isTimeLimitReached) {
        this.onTimeLimitReached()
      }
    }
  }

  getRoundTimestamp() {
    return this.game.timestamp - this.roundStartTimestamp
  }

  handleTimeslow() {
    if (this.isTimeSlowed()) {
      if (this.game.timestamp >= this.slowMotionStopTimestamp) {
        this.stopSlowMotion()
      }

      let slowFactor = Math.floor(Constants.physicsTimeStep / this.tickRate)
      if (this.game.timestamp % slowFactor === 0) return false
    }

    return true
  }

  handleStartRound() {
    if (!this.isRoundStarted && this.shouldTriggerRounds && this.game.timestamp >= this.nextRoundTimestamp) {
      this.startRound()
    }
  }

  handleKickPlayers() {
    if (this.shouldKickPlayersNextRound && this.game.timestamp >= this.nextRoundTimestamp) {
      this.shouldKickPlayersNextRound = false
      this.stopAndRemovePlayers()
      this.game.goToLobby()
      return false
    }

    return true
  }

  handleBots() {
    if (this.game.isLevelEditor) return

    if (this.shouldAddBot()) {
      this.isBotAdded = true
      new PlayerBot({ game: this })
    }
  }

  shouldAddBot() {
    let maxPlayerWaitTimestamp = this.newPlayerJoinTimestamp + Constants.physicsTimeStep * 3

    return (
      !this.isBotAdded &&
      !this.game.isCustomGame() &&
      this.game.timestamp >= maxPlayerWaitTimestamp &&
      this.getPlayerCount() < 2
    )
  }

  removeBots() {
    this.forEachPlayer((player) => {
      if (player.isBot()) {
        player.remove()
      }
    })
  }

  executeTurn() {
    if (!this.isLevelLoaded) return
    let shouldContinueSimulate

    shouldContinueSimulate = this.handleKickPlayers()
    if (!shouldContinueSimulate) return

    shouldContinueSimulate = this.handleTimeslow()
    if (!shouldContinueSimulate) return

    this.handleStartRound()
    this.handleTimeLimit()
    this.handleBots()

    if (this.shouldSimulate()) {
      this.spawnPickups()
      this.spawnMobs()
      this.stepBodies()
      this.executeEntitiesTurn()
      this.teleportBodies()

      // after all adjustments do we only broadcast state
      this.broadcastState()
      this.processLevelEditor()
    }

    this.processExplosionQueue() // make sure run every tick to remove stale queues
  }

  safeExecuteTurn(entity) {
    try {
      entity.executeTurn()
    } catch (e) {
      this.game.captureException(e)
    }
  }

  spawnPickups() {
    this.spawnArrows()
    this.spawnPowerups()
  }

  processLevelEditor() {
    if (!this.game.isLevelEditor) return

    let fourSeconds = Constants.physicsTimeStep * 4
    if (this.game.timestamp % fourSeconds !== 0) return

    this.restoreDestroyedObjects()
  }

  shouldSimulate() {
    if (this.game.isLevelEditor) {
      return this.shouldEditorSimulate
    }

    return true
  }

  stepBodies() {
    this.forEachPlayer((player) => {
      this.stepBody(player)
    })

    this.forEachProjectiles((projectile) => {
      this.stepBody(projectile)
    })

    this.forEachMobs((mob) => {
      this.stepBody(mob)
    })

    this.forEachMovingObjects((movingObject) => {
      this.stepBody(movingObject)
    })
  }

  teleportBodies() {
    // only do this after all collision checks

    try {
      this.forEachPlayer((player) => {
        player.teleportMainBodyToCenter()
      })

      this.forEachMobs((mob) => {
        mob.teleportMainBodyToCenter()
      })

      this.forEachProjectiles((projectile) => {
        projectile.teleportMainBodyToCenter()
      })
    } catch (e) {
      this.game.captureException(e)
    }
  }

  getFirstUnitCollidingWithBox(box, exclude = []) {
    return this.collisionHandler.getFirstUnitCollidingWithBox(box, exclude)
  }

  getUnitsCollidingWithBox(box, exclude = []) {
    return this.collisionHandler.getUnitsCollidingWithBox(box, exclude)
  }

  stepBody(entity) {
    try {
      let prevRow = entity.getRow()
      let prevCol = entity.getCol()

      let position = entity.getPositionCopy()
      entity.applyGravity(this.gravity)
      entity.applyFriction()
      entity.limitFallVelocity()

      // https://gamedev.stackexchange.com/a/29395
      entity.setXFromVelocity()
      entity.limitHorizontalMovement(this.groundMap)

      entity.setYFromVelocity()
      entity.limitVerticalMovement(this.groundMap)
      entity.dampenVelocity()
      entity.recalculateChildPositions()

      let currRow = entity.getRow()
      let currCol = entity.getCol()

      let isGridPositionChanged = currRow !== prevRow || currCol !== prevCol

      if (!entity.equalsPosition(position)) {
        entity.onPositionChanged({ isGridPositionChanged: isGridPositionChanged })
      }
    } catch (e) {
      this.game.captureException(e)
    }
  }

  addBotsIfIdle() {
    if (this.isRoundStarted) return
    if (!this.firstPlayerJoinTime) return
    if (Date.now() - this.firstPlayerJoinTime < 100) return
    if (Date.now() - this.lastBotAddedTime < this.botAddInterval) return
    if (this.getPlayerCount() >= this.MIN_PLAYERS) return

    this.spawnBot()

    this.lastBotAddedTime = Date.now()
    this.newBotAddInterval()
  }

  onRoundStarted() {}

  spawnBot() {
    let x = this.spawnPoint.x
    let y = this.spawnPoint.y
    let delta = 50
    let newX = x + Math.floor(Math.random() * delta * 2) - delta

    new AiBot({
      game: this.game,
      username: this.game.generateUniqueUsername(),
      pos: {
        x: newX,
        y: y,
      },
    })
  }

  executeEntitiesTurn() {
    this.forEachPlayer((player) => {
      this.safeExecuteTurn(player)
    })

    this.forEachMobs((mob) => {
      this.safeExecuteTurn(mob)
    })

    this.forEachMovingObjects((movingObject) => {
      this.safeExecuteTurn(movingObject)
    })

    this.forEachProjectiles((projectile) => {
      this.safeExecuteTurn(projectile)
    })

    this.forEachProcessors((processor) => {
      this.safeExecuteTurn(processor)
    })
  }

  broadcastState() {
    let gameState = this.getGameState()

    gameState.timestamp = this.game.timestamp
    gameState.tick = this.game.server.getStat("tick").maxDuration
    gameState.memory = this.game.server.getStat("memory").usage

    this.forEachHumanPlayer((player) => {
      SocketUtil.emit(player.socket, "GameState", gameState)
    })
  }

  getCameraDisplacement() {
    return (this.getGameWidth() - this.getCameraWidth()) / 2
  }

  getGameWidth() {
    return this.getColCount() * Constants.tileSize
  }

  getGameHeight() {
    return this.getRowCount() * Constants.tileSize
  }

  getCameraWidth() {
    return this.getCameraColCount() * Constants.tileSize
  }

  getCameraHeight() {
    return this.getCameraRowCount() * Constants.tileSize
  }

  getGameState() {
    let state = {}

    state["players"] = this.players
    state["projectiles"] = this.projectiles
    state["movingObjects"] = this.movingObjects
    state["mobs"] = this.mobs

    return state
  }

  getPlayerCount() {
    return Object.keys(this.players).length
  }

  forEachHumanPlayer(cb) {
    for (let id in this.players) {
      let player = this.players[id]
      if (!player.isBot()) {
        cb(player)
      }
    }
  }

  forEachPlayer(cb) {
    for (let id in this.players) {
      cb(this.players[id])
    }
  }

  forEachMobs(cb) {
    for (let id in this.mobs) {
      cb(this.mobs[id])
    }
  }

  forEachMovingObjects(cb) {
    for (let id in this.movingObjects) {
      cb(this.movingObjects[id])
    }
  }

  forEachProjectiles(cb) {
    for (let id in this.projectiles) {
      cb(this.projectiles[id])
    }
  }

  forEachProcessors(cb) {
    for (let id in this.processors) {
      cb(this.processors[id])
    }
  }

  getMapJson(options = {}) {
    let data = {
      name: this.name,
      rowCount: this.rowCount,
      colCount: this.colCount,
      foregroundColor: this.foregroundColor,
      backgroundColor: this.backgroundColor,
      wallColor: this.wallColor,
      staticObjects: this.staticObjects,
      creator: this.map.creator,
      allowedPickupTypes: this.getAllowedPickupTypes()
    }

    if (options.includeUnits) {
      data.players = this.players
      data.pickups = this.pickups
    }

    return data
  }

  addToPickupMap(entity) {
    this.pickupMap.removeTile(entity.getRow(), entity.getCol())
    this.pickupMap.registerTile(entity.getRow(), entity.getCol(), entity)
  }

  isPickupTileOccupied(row, col) {
    return this.pickupMap.isTileOccupied(row, col)
  }

  removeFromPickupMap(entity) {
    this.pickupMap.removeTile(entity.getRow(), entity.getCol())
  }

  addToGroundMap(entity) {
    const box = entity.getBox()

    this.groundMap.removeExisting(box)
    this.groundMap.register(box, entity)
  }

  removeFromGroundMap(entity) {
    this.groundMap.unregister(entity.getBox())
  }

  getSocketIds() {
    return Object.values(this.players).map((player) => {
      return player.getSocketId()
    })
  }

  getPlayerList() {
    return Object.values(this.players)
  }

  getMobList() {
    return Object.values(this.mobs)
  }
}

module.exports = Stage
