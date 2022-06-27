const IDGenerator = require("../util/id_generator")
const Player = require("./player")
const SocketUtil = require("../util/socket_util")
const BadWordsFilter = require("../util/bad_words_filter")
const Stage = require("./stage")
const LevelMap = require("./level_map")
const LevelModel = require("archerfall-common/db/level")
const User = require("archerfall-common/db/user")

const Sentry = require("@sentry/node")
const ExceptionReporter = require("../util/exception_reporter")
const Helper = require("../../common/helper")
const Constants = require("../../common/constants")

class Game {
  constructor(server, options = {}) {
    this.id = options.id || server.allocateGameId()
    this.server = server

    this.name = "Game " + this.id
    this.playerIdMap = {}
    this.players = {}
    this.disconnectedPlayers = {}
    this.host = options.host

    this.entities = {}

    this.idGenerator = new IDGenerator()
    this.timestamp = 0
    this.isPrivate = !!options.isPrivate
    this.mapIndex = 0

    this.initPlayerColors()

    this.stage = new Stage(this, options.map)

    this.server.addGame(this)
  }

  autoStart() {
    this.stage.autoStartRounds()
  }

  setup(cb) {
    this.stage.ensureLevelSetup(() => {
      if (this.isPublicQuickJoinable()) {
        this.server.addJoinableGame(this)
      }

      cb()
    })
  }

  getMapThumbnail() {
    return this.stage.map.data.thumbnail
  }

  updateThumbnail(thumbnail) {
    this.stage.setThumbnail(thumbnail)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyUpdated", {
        thumbnail: thumbnail,
      })
    })
  }

  async changeMap(uid) {
    if (this.isRoundStarted()) return
    if (!uid) return

    const levelMap = await this.server.getMapCopy(uid)
    if (!levelMap) return

    if (this.stage) {
      this.stage.stopAndRemovePlayers()
    }

    this.stage = new Stage(this, levelMap)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyUpdated", {
        thumbnail: this.getMapThumbnail(),
      })
    })
  }

  async queuePlayersForNextStage() {
    try {
      this.shouldStartNextRound = true
      this.mapIndex += 1
      this.nextStageTimestamp = this.timestamp + (Constants.physicsTimeStep * 3)

      let mapIds = this.server.getMapIds()

      if (this.mapIndex >= mapIds.length) {
        this.mapIndex = 0
      }

      let uid = mapIds[this.mapIndex]

      const levelMap = await this.server.getMapCopy(uid)
      if (!levelMap) return

      this.stage = new Stage(this, levelMap)
    } catch(e) {
      this.captureException(e)
    }
  }

  goToLobby() {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "GoToScreen", {
        name: "Lobby",
      })
    })
  }


  initPlayerColors() {
    this.colors = Constants.Colors
  }

  broadcastEvent(eventName, data) {
    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, eventName, data)
    })
  }

  useRandomColor() {
    let list = Object.keys(this.colors)
    let count = list.length
    let randomIndex = Math.floor(Math.random() * count)
    let colorKey = list[randomIndex]

    let value = this.colors[colorKey]
    delete this.colors[colorKey]

    return value
  }

  getRandomHat() {
    let hatList = Object.keys(Constants.Hats)
    let index = Math.floor(Math.random() * hatList.length)
    return hatList[index]
  }

  getId() {
    return this.id
  }

  isCustomGame() {
    return !!this.host
  }

  executeTurn() {
    this.timestamp += 1

    this.cleanupPlayers()

    if (this.shouldStartNextRound && 
       this.timestamp >= this.nextStageTimestamp) {
      this.shouldStartNextRound = false
      this.startGame()
    }

    this.stage.executeTurn()
  }

  addHost(player) {
    this.addPlayer(player)

    this.setHost(player)
  }

  setHost(player) {
    this.host = player
    player.setIsHost(true)
  }

  isHost(player) {
    return this.host === player
  }

  setIsPrivate(isPrivate) {
    this.isPrivate = isPrivate
    this.onIsPrivateChanged()
  }

  onIsPrivateChanged() {
    this.server.matchmakerClient.sendServerInfoToMatchmaker()

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyUpdated", {
        isPrivate: this.isPrivate,
      })
    })
  }

  startGame() {
    // dont start game if currently being edited
    if (this.isLevelEditor) return

    this.stage.ensureLevelSetup(() => {
      this.forEachPlayer((player) => {
        this.stage.addPlayer(player)
        this.sendJoinState(player)
      })

      this.stage.reinit()
      this.stage.startRound()
    })
  }

  emitLobbyJoin(player) {
    SocketUtil.emit(player.socket, "LobbyJoined", {
      players: this.players,
      gameUid: this.getId(),
      playerId: player.getId(),
      thumbnail: this.getMapThumbnail(),
      hostId: this.host.getId(),
      isPrivate: this.isPrivate,
    })
  }

  emitOtherPlayerLobbyJoined(options) {
    if (!this.isCustomGame()) return

    this.forEachPlayer((player) => {
      if (player !== options.except) {
        SocketUtil.emit(player.socket, "OtherPlayerLobbyJoined", {
          player: options.except,
        })
      }
    })
  }

  emitLobbyLeft(targetPlayer) {
    if (!this.isCustomGame()) return

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyLeft", {
        player: targetPlayer,
      })
    })
  }

  forEachPlayer(cb) {
    for (let id in this.players) {
      cb(this.players[id])
    }
  }

  addPlayer(player) {
    player.registerToGame(this)

    this.server.playerNames[player.name] = true
    this.players[player.id] = player
    this.playerIdMap[player.getSocketId()] = player.id
    this.onPlayerCountChanged()

    if (!this.isPublicQuickJoinable()) {
      this.server.removeJoinableGame(this)
    }
  }

  addPlayerAndJoinStage(player) {
    this.addPlayer(player)
    this.addPlayerToStage(player)
  }

  addPlayerToStage(player) {
    this.stage.addPlayer(player)
    this.sendJoinState(player)
  }

  isBadWord(text) {
    return BadWordsFilter.isBadWord(text)
  }

  onPlayerCountChanged() {
    this.stage.onPlayerCountChanged()
    this.server.onPlayerCountChanged()

    if (this.getPlayerCount() === 0) {
      this.remove()
    }
  }

  assignNewHost() {
    let firstPlayer = Object.values(this.players)[0]
    if (!firstPlayer) return

    this.setHost(firstPlayer)

    this.forEachPlayer((player) => {
      SocketUtil.emit(player.socket, "LobbyUpdated", {
        hostId: firstPlayer.getId(),
      })
    })
  }

  removePlayer(player) {
    if (typeof player === "undefined") return
    if (player.isBot()) return

    this.emitLobbyLeft(player)
    this.stage.removePlayer(player)

    const socketId = player.getSocketId()

    delete this.server.playerNames[player.name]
    delete this.players[player.id]
    delete this.playerIdMap[socketId]

    this.onPlayerCountChanged()

    if (this.isPublicQuickJoinable()) {
      this.server.addJoinableGame(this)
    } else {
      this.server.removeJoinableGame(this)
    }

    if (this.host === player) {
      this.host = null
      this.assignNewHost()
    }
  }

  cleanupPlayers() {
    const isOneSecondInterval = this.timestamp % this.server.FRAMES_PER_SECOND === 0
    if (!isOneSecondInterval) return

    const numSecondsAllowDisconnected = 15

    for (let playerId in this.players) {
      try {
        let player = this.players[playerId]
        if (!player.isConnected()) {
          player.increaseDisconnection()

          if (player.disconnection >= numSecondsAllowDisconnected) {
            player.remove()
            delete this.disconnectedPlayers[playerId]
          }
        }
      } catch (e) {
        this.captureException(e)
      }
    }
  }

  captureException(e) {
    Sentry.withScope((scope) => {
      scope.setExtra("gameUid", this.getId())
      ExceptionReporter.captureException(e)
    })
  }

  async resumeSessionForExistingPlayer(existingPlayer, socket) {
    let oldSocket = existingPlayer.socket

    LOG.info(`resumeSessionForExistingPlayer ${existingPlayer.name}`)

    existingPlayer.socket = socket
    this.onPlayerReconnected(existingPlayer, oldSocket.id)

    SocketUtil.emit(socket, "SessionResume", { success: true })
  }

  onPlayerReconnected(player, oldSocketId) {
    LOG.info(player.name + " reconnected ")

    player.resetDisconnection()
    delete this.disconnectedPlayers[player.id]

    // register new socket id
    delete this.playerIdMap[oldSocketId]
    this.playerIdMap[player.getSocketId()] = player.id
  }

  getPlayerBySessionId(sessionId) {
    if (sessionId.length === 0) return null

    let targetPlayer

    for (let playerId in this.players) {
      let player = this.players[playerId]
      if (player.getSessionId() === sessionId) {
        targetPlayer = player
        break
      }
    }

    return targetPlayer
  }

  isRoundStarted() {
    if (!this.stage) return false
    return this.stage.isRoundStarted
  }

  isJoinable() {
    return !this.isFull() && !this.isRoundStarted() && !this.isRemoved
  }

  isPublicQuickJoinable() {
    return this.isJoinable() && !this.isCustomGame()
  }

  isPublicCustomJoinable() {
    return this.isCustomJoinable() && !this.isPrivate
  }

  isCustomJoinable() {
    return !this.isFull() && this.isCustomGame() && !this.isRemoved
  }

  enterLevelEditor(player) {
    if (!this.isHost(player)) return
    if (this.stage.hasPlayer(player)) return

    this.isLevelEditor = true

    this.stage.ensureLevelSetup(() => {
      this.addPlayerToStage(player)
    })
  }

  renameMapLevelEditor(player, data) {
    if (!this.isHost(player)) return
    if (!this.stage) return

    this.stage.setName(data)
  }

  newLevelEditor(player) {
    if (!this.isHost(player)) return

    this.stage.startNewMap()
  }

  importMapToLevelEditor(player, data) {
    if (!this.isHost(player)) return

    try {
      let mapData = JSON.parse(data)

      if (this.isInvalidMap(mapData)) {
        SocketUtil.emit(player.socket, "CantJoin", { message: "Invalid map data" })
        return
      }

      this.stage.startNewMap()
      this.stage.importMap(mapData)
    } catch (e) {
      SocketUtil.emit(player.socket, "CantJoin", { message: "Invalid map data" })
      return
    }
  }

  isInvalidMap(mapData) {
    return !mapData.rowCount || !mapData.colCount || !mapData.blocks || !mapData.backgroundColor
  }

  exitLevelEditor(player) {
    this.isLevelEditor = false

    this.stage.removePlayer(player)
    this.stage.cleanup()
  }

  sendJoinState(player) {
    SocketUtil.emit(player.socket, "JoinGame", {
      playerId: player.id,
      players: this.players,
      gameUid: this.getId(),
      mapData: this.stage.getMapJson({ includeUnits: true }),
      tickRate: this.stage.tickRate,
      isLevelEditor: this.isLevelEditor,
      isCustomGame: this.isCustomGame(),
    })
  }

  getName() {
    return this.name
  }

  toMatchmakerJson() {
    return {
      id: this.getId(),
      name: this.stage.getName(),
      playerCount: this.getPlayerCount(),
      host: this.server.getHost(),
      isRoundStarted: this.stage.isRoundStarted,
      isPrivate: this.isPrivate,
    }
  }

  isFull() {
    return this.getPlayerCount() >= this.server.MAX_PLAYERS_PER_GAME
  }

  getPlayerCount() {
    return Object.keys(this.players).length
  }

  generateEntityId() {
    let found = false
    let id

    while (!found) {
      id = this.idGenerator.generate("entity")
      if (!this.entityIdExists(id)) {
        found = true
      }
    }

    return id
  }

  entityIdExists(id) {
    return this.getEntity(id)
  }

  getEntity(id) {
    return this.entities[id]
  }

  forEachEntity(cb) {
    for (let id in this.entities) {
      cb(this.entities[id])
    }
  }

  registerEntity(entity) {
    this.entities[entity.id] = entity
  }

  unregisterEntity(entity) {
    delete this.entities[entity.id]
  }

  addDisconnectedPlayer(player) {
    this.disconnectedPlayers[player.id] = player
  }

  pointFromDistance(x, y, distance, radian) {
    const xp = distance * Math.cos(radian)
    const yp = distance * Math.sin(radian)

    return { x: x + xp, y: y + yp }
  }

  distanceBetweenEntity(entity, otherEntity) {
    return Helper.distance(entity.getX(), entity.getY(), otherEntity.getX(), otherEntity.getY())
  }

  remove() {
    this.isRemoved = true

    this.stage.remove()
    this.server.removeGame(this)
    this.server.removeJoinableGame(this)
  }

  getPlayerBySocketId(socketId) {
    const playerId = this.playerIdMap[socketId]
    return this.players[playerId]
  }

  emitPlayerChanged(player) {}
}

module.exports = Game
