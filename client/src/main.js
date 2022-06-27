window.env = location.hostname === "archerfall.io" ? "production" : "development"
window.debugMode = window.env === "development"
window.socket = null

const SocketUtil = require("./util/socket_util")
const Protocol = require("./../../common/util/protocol")
const Game = require("./entities/game")
const GameConnection = require("./components/game_connection")
const uuidv4 = require('uuid/v4')
const ExceptionReporter = require("./util/exception_reporter")
const ClientHelper = require("./util/client_helper")
const isMobile = require('ismobilejs')
const Cookies = require("js-cookie")
const Matchmaker = require("./components/matchmaker")
const Authentication = require("./util/authentication")
const FirebaseClientHelper = require("./util/firebase_client_helper")
const Constants = require("../../common/constants.json")
const Helper = require("../../common/helper")

require("./util/polyfill")
require('url-search-params-polyfill')

class Main {
  run() {
    if (env === "production") {
      this.initAnalytics()
      this.initErrorReporting()
    }

    this.zoom = 1

    this.mobileDetect()
    this.initSessionId()
    this.initAuthentication()
    this.initListeners()
    this.initUI()
    this.initGame()
    this.initMatchmaker()
    this.initCosmetics()
  }

  initMatchmaker() {
    this.matchmaker = new Matchmaker(this)
    this.matchmaker.connectToNearbyServer(() => {
      this.onMatchmakerReady()
    })
  }

  onLobbyJoin(data) {
    document.querySelector(".browse_game_menu").style.display = "none"
    document.querySelector(".game_lobby_menu").style.display = "block"
  }

  initGame() {
    let game = new Game(this)
    this.game = game
    window.game = game
  }

  mobileDetect() {
    this.isMobile = isMobile.default().any
    
    if (this.isMobile) {
      document.querySelector("body").classList.add("mobile")

      this.showHideRotateDevice()
    }
  }

  showHideRotateDevice() {
    if (!this.isMobile) return

    if (document.querySelector(".home_page").classList.contains("active")) {
      if (window.innerHeight > window.innerWidth) {
        document.querySelector(".please_rotate_container").style.display = 'block'
        document.querySelector(".home_page").classList.add("hidden")
        document.querySelector("#game_canvas").style.display = 'none'
      } else {
        document.querySelector(".please_rotate_container").style.display = 'none'
        document.querySelector(".home_page").classList.remove("hidden")
        document.querySelector("#game_canvas").style.display = 'block'
      }
    }
  }

  initAnalytics() {
    const trackingId = "G-003HGMPZMC"
    document.write('<script async src="https://www.googletagmanager.com/gtag/js?id=' + trackingId + '"></script>')
    window.dataLayer = window.dataLayer || []
    function gtag(){dataLayer.push(arguments)}
    window.gtag = gtag
    gtag('js', new Date())
    gtag('config', trackingId)
  }

  initErrorReporting() {
    ExceptionReporter.init()
  }

  initAuthentication() {
    this.authentication = new Authentication(this)
    this.authentication.onUserAuthenticated(this.onUserAuthenticated.bind(this))
  }

  async onUserAuthenticated() {
    document.body.classList.add("authenticated")
    let idToken = await this.authentication.getFirebaseIdToken()
    let uid = this.authentication.uid
    this.matchmaker.fetchMyProfile(idToken, uid, (userProfile) => {
      this.renderMyProfile(userProfile)
    })
  }

  onUserLogout() {
    document.body.classList.remove("authenticated")
  }

  renderMyProfile(userProfile) {
    console.log(userProfile)
  }

  initSessionId() {
    this.sessionId = uuidv4()
  }

  initCosmetics() {
    // hats
    this.currentHatIndex = 0
    this.hatList = Helper.shuffleArray(Object.keys(Constants.Hats).concat("NoHat"))
    this.hatList.forEach((hat) => {
      let el = this.createHatEntry(hat)
      document.querySelector(".hat_container").appendChild(el)
    })

    // colors
    this.currentColorIndex = 0
    this.colorList = Helper.shuffleArray(Object.values(Constants.Colors))

    this.fetchSavedCosmeticPreference()
  }

  fetchSavedCosmeticPreference() {
    let hat = Cookies.get("hat")
    if (hat) {
      let index = this.hatList.indexOf(hat)
      if (index !== -1) {
        this.currentHatIndex = index
      }
    }

    let color = Cookies.get("color")
    if (color) {
      let index = this.colorList.indexOf(color)
      if (index !== -1) {
        this.currentColorIndex = index
      }
    }
  }

  createHatEntry(hat) {
    let div = document.createElement("div")
    div.className = "hat_entry"

    let thumbnailName = this.game.camelToSnakeCase(hat) + ".png"
    let img = document.createElement("img")
    img.src = "/assets/images/" + thumbnailName

    div.appendChild(img)

    return div
  }

  initListeners() {
    document.querySelector(".rankings_btn").addEventListener("click", this.onRankingsBtnClick.bind(this), true)
    document.querySelector(".rankings_menu .close_btn").addEventListener("click", this.onRankingsCloseBtnClick.bind(this), true)
    document.querySelector(".play_btn").addEventListener("click", this.onPlayBtnClick.bind(this), true)
    document.querySelector(".home_menu_overlay").addEventListener("click", this.onHomeMenuOverlayClick.bind(this), true)
    document.querySelector(".level_editor_btn").addEventListener("click", this.onLevelEditorBtnClick.bind(this), true)
    document.querySelector(".browse_game_btn").addEventListener("click", this.onBrowseGameBtnClick.bind(this), true)
    document.querySelector(".customize_panel").addEventListener("click", this.onCustomizePanelClick.bind(this), true)

    document.querySelector(".home_back_btn").addEventListener("click", this.onHomeBackBtnClick.bind(this), true)
    document.querySelector(".home_join_room_btn").addEventListener("click", this.onHomeJoinRoomBtnClick.bind(this), true)
  }

  onHomeBackBtnClick() {
    window.history.replaceState('', '', '?')

    document.querySelector(".enter_game_container").style.display = 'block'
    document.querySelector(".enter_room_container").style.display = 'none'
  }

  onHomeJoinRoomBtnClick() {
    let gameUid = this.getUrlParam().get("r")
    this.matchmaker.findServer(gameUid, (result) => {
      if (result.server) {
        this.joinLobby(gameUid, result.server)
      } else {
        this.onPlayerCantJoin({ message: "Cant find game " + gameUid })
      }
    })
  }

  onCustomizePanelClick(e) {
    let tab = e.target.closest(".customize_player_tab")
    if (!tab) return

    let panel = tab.dataset.panel
    if (panel === 'color') {
      this.assignNextColor()
    } else if (panel === 'hat') {
      this.assignNextHat()
    }
  }

  assignNextColor() {
    this.currentColorIndex++
    if (this.currentColorIndex >= this.colorList.length) {
      this.currentColorIndex = 0
    }

    let colorString = this.colorList[this.currentColorIndex]
    this.game.homePlayer.assignColor(colorString)

    Cookies.set("color", colorString)
  }

  assignNextHat() {
    if (!this.game.homePlayer) return

    this.currentHatIndex++
    if (this.currentHatIndex >= this.hatList.length) {
      this.currentHatIndex = 0
    }

    let hatName = this.hatList[this.currentHatIndex]
    this.game.homePlayer.assignHat(hatName)

    Cookies.set("hat", hatName)
  }

  onOrientationChange() {
    this.showHideRotateDevice()
  }

  async onCreateCustomGameClick() {
    let gameServer = await this.matchmaker.getAvailableServer()
    if (!gameServer) {
      this.onPlayerCantJoin({ message: "Servers unavailable" })
      return
    }

    let url = this.getServerWebsocketUrlForIp(gameServer)
    this.connectGame(url, () => {
      this.createCustomGame()
    })
  }

  onRankingsBtnClick() {
    document.querySelector(".rankings_menu").style.display = 'block'
    this.matchmaker.fetchLeaderboard((leaderboard) => {
      this.renderGlobalLeaderboard(leaderboard)
    })
  }

  renderGlobalLeaderboard(leaderboard) {
    document.querySelector(".global_rankings_list_body").innerHTML = ""

    let rank = 1
    leaderboard.forEach((ranking) => {
      ranking.rank = rank
      let el = this.createGlobalLeaderboardEntry(ranking)
      document.querySelector(".global_rankings_list_body").appendChild(el)
      rank++
    })
  }

  createGlobalLeaderboardEntry(ranking) {
    let row = document.createElement("div")
    row.classList.add("global_leaderboard_row")

    let col = document.createElement("div")
    col.classList.add("rank")
    col.classList.add("global_leaderboard_col")
    col.innerText = ranking.rank
    row.appendChild(col)

    col = document.createElement("div")
    col.classList.add("name")
    col.classList.add("global_leaderboard_col")
    col.innerText = ranking.name
    row.appendChild(col)

    col = document.createElement("div")
    col.classList.add("winCount")
    col.classList.add("global_leaderboard_col")
    col.innerText = ranking.winCount
    row.appendChild(col)

    col = document.createElement("div")
    col.classList.add("playCount")
    col.classList.add("global_leaderboard_col")
    col.innerText = ranking.playCount
    row.appendChild(col)

    return row
  }

  onRankingsCloseBtnClick() {
    document.querySelector(".rankings_menu").style.display = 'none'
  }

  onHomeMenuOverlayClick(e) {
    if (e.target.classList.contains("home_menu_overlay")) {
      if (this.isMatchmakerReady && this.isGameReady) {
        this.onPlayBtnClick()
      }
    }
  }

  async onPlayBtnClick() {
    if (this.isPlayLocked) return
    this.isPlayLocked = true

    let gameServer = await this.matchmaker.getAvailableServer()
    if (!gameServer) {
      this.onPlayerCantJoin({ message: "Servers unavailable" })
      return
    }

    let url = this.getServerWebsocketUrlForIp(gameServer)
    this.connectGame(url, () => {
      this.requestGame()
    })
  }

  onLevelEditorBtnClick() {
    SocketUtil.emit("LevelEditor", { action: 'enter' })
  }

  onBrowseGameBtnClick() {
    this.matchmaker.show()
  }

  getCurrentColor() {
    return this.colorList[this.currentColorIndex]
  }

  getCurrentHat() {
    return this.hatList[this.currentHatIndex]
  }

  async createCustomGame() {
    let data = {
      sessionId: this.sessionId,
      isCustomGame: true,
      hat: this.getCurrentHat(),
      color: this.getCurrentColor(),
    }

    if (this.authentication.isLoggedIn()) {
      let idToken = await this.authentication.getFirebaseIdToken()
      data["idToken"] = idToken
      data["uid"] = this.authentication.uid
    }

    SocketUtil.emit("RequestGame", data)
  }

  getBrowserHost() {
    return window.location.origin
  }

  joinLobby(gameUid, ip) {
    this.connectGame(this.getServerWebsocketUrlForIp(ip), () => {
      this.requestGame({ gameUid: gameUid, isJoinLobby: true })
    })
  }

  checkLocalStorageSupport() {
    let result = true

    try {
      window.localStorage
    } catch(e) {
      result = false
    }

    return result
  }

  async requestGame(options = {}) {
    let data = {
      sessionId: this.sessionId,
      hat: this.getCurrentHat(),
      color: this.getCurrentColor()
    }

    if (options.gameUid) {
      data.gameUid = options.gameUid
    }

    if (this.authentication.isLoggedIn()) {
      let idToken = await this.authentication.getFirebaseIdToken()
      data["idToken"] = idToken
      data["uid"] = this.authentication.uid
    }

    if (options) {
      data = Object.assign({}, data, options)
    }

    SocketUtil.emit("RequestGame", data)
  }

  openlevelEditor() {
    SocketUtil.emit("RequestGame", { levelEditor: true })
  }

  showPage(name) {
    let activePage = document.querySelector(".page.active")
    if (activePage) {
      activePage.classList.remove("active")
    }


    let page = document.querySelector(".page." + name)
    if (page) {
      page.classList.add("active")
    }

    if (name === "home_page") {
      this.onHomePageShown()
    } else {
      this.onGamePageShown()
    }

    this.game.updateCanvasResolution()
  }

  onHomePageShown() {
      document.querySelector("#move_joystick").style.display = 'none'
      document.querySelector("#shoot_joystick").style.display = 'none'

      document.querySelector(".gameplay_footage").style.display = 'block'
      document.querySelector(".gameplay_footage").play()
  }

  onGamePageShown() {
      document.querySelector("#move_joystick").style.display = 'block'
      document.querySelector("#shoot_joystick").style.display = 'block'

      document.querySelector(".gameplay_footage").style.display = 'none'
      document.querySelector(".gameplay_footage").pause()
  }

  isInHomePage() {
    return document.querySelector(".home_page").classList.contains("active")
  }

  getServerWebsocketUrlForIp(ip) {
    let protocol = this.isHttps() ? "wss://" : "ws://"

    return protocol + ip
  }


  getServerHttpUrl() {
    let protocol = this.isHttps() ? "https://" : "http://"

    return protocol + this.getHost() 
  }

  getServerHTTPUrlForIp(ip) {
    let protocol = this.isHttps() ? "https://" : "http://"
    return protocol + ip
  }


  getHost() {
    return debugMode ? "localhost:8000" : "game-nyc1-9fdf9957.archerfall.io"
  }

  onGameReady() {
    this.isGameReady = true
    this.allowPlayIfReady()
  }

  onMatchmakerReady() {
    this.isMatchmakerReady = true
    this.allowPlayIfReady()
  }

  allowPlayIfReady() {
    if (this.isMatchmakerReady && this.isGameReady) {
      document.querySelector("#connecting_message").style.display = 'none'
      this.showPlayInput()
    }
  }

  showPlayInput() {
    let gameUid = this.getUrlParam().get("r")
    if (gameUid) {
      document.querySelector(".enter_game_container").style.display = 'none'
      document.querySelector(".enter_room_container").style.display = 'block'
    } else {
      document.querySelector(".enter_game_container").style.display = 'block'
      document.querySelector(".enter_room_container").style.display = 'none'
      document.querySelector(".home_click_to_play").style.display = 'block'
    }
  }



  isHttps() {
    if (env === "staging" || env === "production") return true
    return window.location.protocol === "https:"
  }

  connectGame(url, cb) {
    if (this.gameConnection) {
      let isSameAsExistingConnection = this.gameConnection.url === url
      if (isSameAsExistingConnection) {
        if (this.gameConnection.isConnected()) {
          cb()
          return
        }
      } else {
        this.gameConnection.close()
      }
    }

    this.gameConnection = new GameConnection(url)
    this.gameConnection.init({
      success: (gameConnection) => {
        this.game.setGameConnection(this.gameConnection)

        if (cb) cb()
      },
      error: (wasNeverConnected) => {
        if (wasNeverConnected) {
          this.onPlayerCantJoin({ message: "Cant connect to server " + url })
        } else {
          this.enableJoin()
        }
      }
    })

  }

  onPlayerCantJoin(options = {}) {
    this.displayError(options) 
    document.querySelector("#connecting_message").style.display = 'none'

    this.enableJoin()
  }

  displayError(options) {
    clearTimeout(this.removeErrorTimeout)
    Array.from(document.querySelectorAll(".error_message")).forEach((el) => {
      el.style.display = 'block'
      el.innerText = options.message
    })

    this.removeErrorTimeout = setTimeout(() => {
      Array.from(document.querySelectorAll(".error_message")).forEach((el) => {
        el.style.display = 'none'
      })
    }, 3000)
  }

  displaySuccess(options) {
    clearTimeout(this.removeErrorTimeout)
    Array.from(document.querySelectorAll(".success_message")).forEach((el) => {
      el.style.display = 'block'
      el.innerText = options.message
    })

    this.removeErrorTimeout = setTimeout(() => {
      Array.from(document.querySelectorAll(".success_message")).forEach((el) => {
        el.style.display = 'none'
      })
    }, 3000)
  }

  enableJoin() {
    this.isPlayLocked = false
    this.resetButtonStates()
  }

  resetButtonStates() {
    document.querySelector(".play_btn .play_spinner").style.display = 'none'
  }

  initUI() {
  }

  getUrlParam() {
    const url = this.getBrowserHref()
    return new URLSearchParams(url.split("?")[1])
  }

  getBrowserHref() {
    return document.location.href
  }

}

window.main = new Main()
window.main.run()
