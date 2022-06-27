const Config = require("./config")
const WebSocket = require('ws')
const ExceptionReporter = require("./util/exception_reporter")


class MatchmakerClient {
  constructor(server) {
    this.server = server
  }

  connect() {
    if (env === 'test') return

    let url = Config[env].matchmakerGameServerWebsocketUrl

    this.socket = new WebSocket(url)

    this.socket.on('close', () => {
      if (!this.isRestartCountdownSent) {
        // only reconnect when we are not in process of shutting down
        LOG.error("disconnected from matchmaker. reconnecting..")
        setTimeout(this.connect.bind(this), 5000)
      }
    })

    this.socket.on('error', (err) => {
      if (debugMode) {
        LOG.error("socket error matchmaker")
        console.log(err)
      }
    })

    this.socket.onmessage = this.onMatchmakerMessage.bind(this)

    this.socket.on('open', () => {
      console.log("connected to matchmaker " + url)
      console.log("socket.readyState: " + this.socket.readyState)
      setTimeout(() => {
        this.informMatchmaker()
      }, 3000)
    })
  }

  onMatchmakerMessage(event) {
    try {
      let message = JSON.parse(event.data)
      let data = message.data

      switch(message.event) {
        case "Restart":
          this.restartServer(data)
          break
        default:
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  restartServer() {

  }

  informMatchmaker() {
    console.log("[informMatchmaker] socket.readystate: " + this.socket.readyState)
    this.sendServerInfoToMatchmaker()
  }

  sendServerInfoToMatchmaker() {
    if (env === 'test') return

    this.sendToMatchmaker({ event: "ServerUpdated", data: this.getServerData() })
  }

  sendToMatchmaker(data) {
    if (env === 'test') return

    let socket = this.getMatchmakerSocket()
    if (socket.readyState !== WebSocket.OPEN) return

    const message = JSON.stringify(data)
    socket.send(message)
  }


  getMatchmakerSocket() {
    return this.socket
  }

  getServerData() {
    let data = {
      env: this.server.getEnvironment(),
      region: this.server.getRegion(),
      host: this.server.getHost(),
      version: this.server.getVersion(),
      revision: this.server.getRevision(),
      memory: this.server.getMemoryUsageInMB(),
      playerCount: this.server.getPlayerCount(),
      games: this.server.getGamesJson()
    }

    if (this.server.systemdIndex) {
      data.systemdIndex = this.server.systemdIndex
    }

    if (this.server.debugPort) {
      data.debugPort = this.server.debugPort
    }

    return data
  }

  sendHeartbeat() {
    try {
      let isOneMinute = (Date.now() - this.lastHeartBeatTime) > (1000 * 60)
      let shouldSendHeartbeat = !this.lastHeartBeatTime || isOneMinute
      if (shouldSendHeartbeat) {
        // to keep ws connection alive
        this.sendToMatchmaker({ event: "Heartbeat", data: this.getServerData() })
        this.lastHeartBeatTime = Date.now()
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }



}

module.exports = MatchmakerClient
