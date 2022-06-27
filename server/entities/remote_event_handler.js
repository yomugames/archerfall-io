const ExceptionReporter = require("../util/exception_reporter")
const SocketUtil = require("../util/socket_util")
const LOG = require('../util/logger')
const Helper = require("../../common/helper")

class RemoteEventHandler {

  constructor(server) {
    this.server = server
  }

  onSocketMessage(eventName, data, socket) {
    let handlerName = "on" + eventName

    let player = this.getPlayerBySocket(socket)

    let eventsNotRequiringPlayer = ["RequestGame", "CreateRoom", "ResumeGame", "Ping", "CheckUsername", "LevelEditor"]
    if (!this[handlerName]) {
      console.log("Missing remoteEventHanlder: " + handlerName)
      return
    }

    if (eventsNotRequiringPlayer.indexOf(eventName) !== -1) {
      this[handlerName](player, data, socket)
    } else {
      if (!player) {
        // weird hack. not sure why its happening. 
        let existingPlayer = this.getPlayerBySessionId(socket.sessionId)
        if (existingPlayer) {
          existingPlayer.game.resumeSessionForExistingPlayer(existingPlayer, socket)
          player = existingPlayer
        }
      }

      this[handlerName](player, data, socket)
    }
  }

  getPlayerBySocket(socket) {
    let targetPlayer

    let games = this.getGames()
    for (let id in games) {
      let game = games[id]
      let player = game.getPlayerBySocketId(socket.id)
      if (player) {
        targetPlayer = player
        break
      }
    }

    return targetPlayer
  }

  getPlayerBySessionId(sessionId) {
    let targetPlayer

    let games = this.getGames()
    for (let id in games) {
      let game = games[id]
      let player = game.getPlayerBySessionId(sessionId)
      if (player) {
        targetPlayer = player
        break
      }
    }

    return targetPlayer
  }

  getGames() {
    return this.server.games
  }

  onPing(player, data, socket) {
    SocketUtil.emit(socket, "Pong", {})
  }

  onClientChat(player, data, socket) {
    if (player) {
      player.chat(data)
    }
  }

  onClientDisconnect(socket) {
    const player = this.getPlayerBySocket(socket)
    if (!player) return

    let duration = player.getSessionDuration()
    player.game.addDisconnectedPlayer(player)
  }

  onResumeGame(player, data, socket) {
    socket.sessionId = data.sessionId

    let existingPlayer = this.getPlayerBySessionId(data.sessionId)
    if (existingPlayer) {
      if (existingPlayer.isConnected()) return

      existingPlayer.game.resumeSessionForExistingPlayer(existingPlayer, socket)
    } else {
      SocketUtil.emit(socket, "SessionResume", { success: false })
    }
  }

  onPlayerInput(player, data, socket) {
    if (!player) return
      
    player.updateInput(data)
  }

  onLeaveGame(player, data, socket) {
    if (!player) return
      
    let duration = player.getSessionDuration()

    if (data.isLeaveStage && player.game.isHost(player)) {
      // only hosts can stop the game.
      player.game.stage.stopAndRemovePlayers()
    } else {
      player.remove()
    }
  }

  onUpdateThumbnail(player, data, socket) {
    if (!player) return
    if (!player.game.isHost(player)) return

    player.game.updateThumbnail(data.thumbnail)
  }

  onChangeMap(player, data, socket) {
    if (!player) return
    if (!player.game.isHost(player)) return

    player.game.changeMap(data.uid)
  }

  onPlayerTarget(player, data, socket) {
    if (!player) return

    player.updateTarget(data)
  }

  onBuild(player, data, socket) {
    if (!player) return

    player.build(data)
  }

  onEditLevel(player, data, socket) {
    if (!player) return

    player.editLevel(data)
  }

  onStartGame(player, data, socket) {
    if (!player) return

    if (!player.game.isHost(player)) {
      return
    }

    player.game.startGame()
  }

  onRequestGame(player, data, socket) {
    try {
      if (this.server.isServerFull()) {
        SocketUtil.emit(socket, "CantJoin", {})
        return
      }

      if (player) {
        player.remove()
      }

      socket.sessionId    = data.sessionId

      if (data.isCustomGame) {
        this.server.createCustomGame(socket, data)
      } else if (data.isJoinLobby) {
        this.server.joinLobby(socket, data)
      } else {
        this.server.join(socket, data)
      }
    } catch(e) {
      SocketUtil.emit(socket, "CantJoin", { message: "Server error. Unable to connect." })
      throw e
    }
  }

  onLevelEditor(player, data, socket) {
    if (!player) return
    let game = player.game
    if (!game) return

    if (data.action === "exit") {
      game.exitLevelEditor(player)
    } else if (data.action === 'enter') {
      game.enterLevelEditor(player)
    } else if (data.action === 'new') {
      game.newLevelEditor(player)
    } else if (data.action === 'import') {
      game.importMapToLevelEditor(player, data.data)
    } else if (data.action === 'name') {
      game.renameMapLevelEditor(player, data.data)
    }
    
  }

  onEditLobby(player, data, socket) {
    if (!player) return
    let game = player.game
    if (!game) return

    if (data.hasOwnProperty("isPrivate")) {
      if (game.isHost(player)) {
        game.setIsPrivate(data.isPrivate)
      }
      
    }
  }

}

module.exports = RemoteEventHandler
