const SocketUtil = require("../util/socket_util")

class GameConnection {

  constructor(url) {
    this.url = url

    this.reconnectAttemptCount = 0
    this.isFirstSocketSetup = true
    this.reconnectDelay = 1
  }

  init(options) {
    this.initWebsocket(options)
  }

  close() {
    this.isTerminated = true
    if (this.socket) {
      this.socket.close()
    }
    
  }

  setGame(game) {
    this.game = game
  }

  initWebsocket(options) {
    this.websocketSetupTime = (new Date()).getTime()

    this.setupSocket(options)
  }

  setupSocket(callback) {
    this.socket = new WebSocket(this.url)
    this.socket.binaryType = "arraybuffer"

    this.socket.onopen = () => {
      if (this.isFirstSocketSetup) {
        this.isFirstSocketSetup = false
        let selfTime = (new Date()).getTime() - this.websocketSetupTime
        console.log("connected to: " + this.url + " took " + (selfTime / 1000).toFixed(1) + " seconds")
      }

      if (callback.success) callback.success(this.socket)
    }

    this.socket.onerror = () => {
      let wasNeverConnected = this.isFirstSocketSetup
      if (callback.error) callback.error(wasNeverConnected)
    }

    this.socket.onclose = this.onSocketDisconnect.bind(this)
  }

  onSocketDisconnect(event) {
    if (this.isFirstSocketSetup) return
    if (this.isTerminated) return

    if (!this.game) return

    if (this.game.isAFK) {
      this.displayDisconnected()
      return
    }

    let serverIp = this.getServerIp()

    const delay = (this.reconnectAttemptCount + 1) * this.reconnectDelay
    if (this.reconnectAttemptCount > 3) {
      this.displayDisconnected()
    } else {
      this.attemptReconnect(delay)
    }
  }

  getServerIp() {
    return this.url.replace(/ws.*\//,"")
  }

  getDots(reloadIncrement) {
    let progress = (reloadIncrement % 3) + 1

    let dots = ""
    for (var i = 0; i < progress; i++) {
      dots += "."
    }

    return dots
  }

  displayDisconnected() {
    this.game.goToHomepage()
    this.game.main.onPlayerCantJoin({ message: "Disconnected from server." })

    if (this.game.lobby) {
      this.game.lobby.hide()
    }
  }

  isConnected() {
    if (!this.socket) return false
    return this.socket.readyState === WebSocket.OPEN        
  }

  attemptReconnect(delay) {
    const message    = document.querySelector(".disconnected_msg")
    message.style.display = 'block'
    message.innerText = "Reconnecting.."

    let countdown = delay

    clearInterval(this.reconnectCountdownInterval)
    this.reconnectCountdownInterval = setInterval(() => {
      countdown -= 1
      if (countdown <= 0) {
        clearInterval(this.reconnectCountdownInterval)
      }
    }, 1000)

    let reconnect = this.reconnectWebsocket.bind(this, { success: this.resumeGame.bind(this) })
    setTimeout(reconnect, delay * 1000)
  }

  resumeGame() {
    this.reconnectAttemptCount = 0

    this.game.resumeGame()
  }

  onSessionResume() {
    console.log("session resumed..")
    document.querySelector(".disconnected_msg").style.display = 'none'
  }

  onSessionResumeFailed() {
    this.displayDisconnected()
  }

  reconnectWebsocket(callback) {
    console.log("Reconnecting...")

    this.reconnectAttemptCount += 1
    this.setupSocket(callback)
    this.game.reinitConnection()
  }

}

module.exports = GameConnection