const SocketUtil = require('../client/src/util/socket_util')
const Protocol = require('../common/util/protocol')
const Constants = require('../common/constants')
const base64id = require('base64id')

global.WebSocket = require('ws')

let botCount = 0

class PlayerBot {
  constructor(sectorId) {
    botCount += 1
    this.id = "@bot_" + this.createShortId()
    this.username = this.id

    this.screenWidth = 1280
    this.screenHeight = 800

    this.socketUtil = new SocketUtil()
    this.MATCHMAKER_WEBSOCKET_URL = "ws://localhost:8000"
  }

  createShortId() {
    return base64id.generateId().replace(/-/g,"_").substr(0,10)
  }

  joinGameServer(url, options = {}) {
    this.setupWebsocket(url, () => {
      let data = {
        username: this.username, 
        screenWidth: this.screenWidth, 
        screenHeight: this.screenHeight,
        isTroubleshooter: true
      }

      this.socketUtil.emit("RequestGame", data)
      
    })
  }

  getServerWebsocketUrl(ip) {
    let protocol = this.isHttps() ? "wss://" : "ws://"
    return protocol + ip
  }

  isHttps() {
    if (env === "staging" || env === "production") return true
    return false
  }

  setupWebsocket(url, onReady) {
    Protocol.initServer((error, protocol) => {
      this.connectToServer(url, () => {
        this.socketUtil.init({ protocol: Protocol.protocol, allowMissingHandlers: true })
        this.socketUtil.setSocket(this.socket)
        this.initSocketHandlers()
        onReady()
      })
    })
  }

  run() {
    this.socketUtil.emit("Ping", {})
  }

  onPlayerJoined(data) {
    console.log(this.id + " joined..")

    this.runInterval = setInterval(this.run.bind(this), 3000)
  }

  leaveGame() {
    clearInterval(this.runInterval)
    this.socketUtil.emit("LeaveGame", {})
    console.log(this.id + " leave game..")
  }

  teleportToGalaxy() {
    // this.socketUtil.emit("TeleportRequest", { sectorType: "ffa" })
  }

  initSocketHandlers() {
    // SocketUtil.on("GameState", this.onSyncWithServer.bind(this))
    this.socketUtil.on("JoinGame", this.onPlayerJoined.bind(this))
    this.socketUtil.on("CantJoin", this.onPlayerCantJoin.bind(this))
  }

  onPlayerCantJoin(data) {
    console.log(this.username + " cant join server. " + data.message)
  }

  connectToServer(url, onReady) {
    this.socket = new WebSocket(url, {
      rejectUnauthorized: false
    })

    this.socket.on('open', () => {
      console.log(this.id + " connected to " + url)
      onReady()
    });

    this.socket.on('close', () => {
      console.log("closed socket")
    });

    this.socket.on('error', (err) => {
      console.log(err)
      console.log("error socket")
    });

  }

}

module.exports = PlayerBot