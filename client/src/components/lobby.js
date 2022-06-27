const SocketUtil = require("../util/socket_util")
const ClientHelper = require("../util/client_helper")
const ChatMenu = require("./chat_menu")

class Lobby {
  constructor(game, data) {
    this.game = game
    this.gameUid = data.gameUid
    
    this.setIsPrivate(data.isPrivate)
    this.setShareUrl(data.gameUid)

    this.initPlayers(data)

    this.initListeners()
    this.keepConnectionAlive()

    this.chatMenu = new ChatMenu(this.game, document.querySelector(".game_lobby_menu .chat_container"))

    this.updateThumbnail(data.thumbnail)
  }

  setShareUrl(gameUid) {
    let params = window.location.search
    params = ClientHelper.replaceQueryParam('r', gameUid, params)
    let inviteLink = this.game.main.getBrowserHost() + params

    document.querySelector(".game_lobby_menu .share_url").value = inviteLink
  }

  setIsPrivate(isPrivate) {
    this.isPrivate = isPrivate

    if (this.isPrivate) {
      document.querySelector(".game_lobby_menu .privacy_btn").classList.add("private") 
      document.querySelector(".game_lobby_menu .privacy_btn").innerText = "Private"
    } else {
      document.querySelector(".game_lobby_menu .privacy_btn").classList.remove("private") 
      document.querySelector(".game_lobby_menu .privacy_btn").innerText = "Public"
    }
  }

  cleanup() {
    document.querySelector(".game_lobby_menu .close_btn").removeEventListener("click", this.onCloseClickHandler, true)
    document.querySelector(".game_lobby_menu .start_custom_game_btn").removeEventListener("click", this.onStartCustomGameClickHandler, true)
    document.querySelector(".game_lobby_menu .change_map_btn").removeEventListener("click", this.onChangeMapClickHandler, true)
    document.querySelector(".game_lobby_menu .privacy_btn").removeEventListener("click", this.onPrivacyBtnClickHandler, true)
    document.querySelector(".game_lobby_menu .copy_link_btn").removeEventListener("click", this.onCopyLinkBtnClickHandler, true)
    document.querySelector(".game_lobby_menu .share_url").removeEventListener("click", this.onShareInputClickHandler, true)

    this.chatMenu.cleanup()
  }

  initPlayers(data) {
    this.players = {}

    this.currentPlayerId = data.playerId

    this.playerListEl = document.querySelector(".game_lobby_menu .player_list")
    this.playerListEl.innerHTML = ""

    for (let id in data.players) {
      this.addPlayer(data.players[id])
    }

    this.setHostId(data.hostId)
  }

  renderHostIcon() {
    let playerEntry = this.playerListEl.querySelector(`.player_entry[data-uid='${this.hostId}']`)
    if (playerEntry) {
      playerEntry.classList.add('host')
    }
  }

  updateThumbnail(thumbnail) {
    this.thumbnail = thumbnail
    this.updateMapScreenshot(this.thumbnail)
  }

  setHostId(hostId) {
    this.hostId = hostId

    if (this.isCurrentPlayerHost()) {
      document.querySelector(".game_lobby_menu .action_container").classList.remove('disabled')
      document.querySelector(".game_lobby_menu .config_container").classList.remove('disabled')
    } else {
      document.querySelector(".game_lobby_menu .action_container").classList.add('disabled')
      document.querySelector(".game_lobby_menu .config_container").classList.add('disabled')
    }

    this.renderHostIcon()
  }

  isCurrentPlayerHost() {
    return this.getCurrentPlayer().id === this.hostId
  }

  keepConnectionAlive() {

  }

  initListeners() {
    this.onCloseClickHandler = this.onCloseClick.bind(this)
    this.onStartCustomGameClickHandler = this.onStartCustomGameClick.bind(this)
    this.onChangeMapClickHandler = this.onChangeMapClick.bind(this)
    this.onPrivacyBtnClickHandler = this.onPrivacyBtnClick.bind(this)
    this.onCopyLinkBtnClickHandler = this.onCopyLinkBtnClick.bind(this)
    this.onShareInputClickHandler = this.onShareInputClick.bind(this)

    document.querySelector(".game_lobby_menu .close_btn").addEventListener("click", this.onCloseClickHandler , true)
    document.querySelector(".game_lobby_menu .start_custom_game_btn").addEventListener("click", this.onStartCustomGameClickHandler , true)
    document.querySelector(".game_lobby_menu .change_map_btn").addEventListener("click", this.onChangeMapClickHandler , true)
    document.querySelector(".game_lobby_menu .privacy_btn").addEventListener("click", this.onPrivacyBtnClickHandler , true)
    document.querySelector(".game_lobby_menu .copy_link_btn").addEventListener("click", this.onCopyLinkBtnClickHandler , true)
    document.querySelector(".game_lobby_menu .share_url").addEventListener("click", this.onShareInputClickHandler , true)
  }

  onChangeMapClick() {
    this.game.browseMapMenu.show()
  }

  onPrivacyBtnClick() {
    SocketUtil.emit("EditLobby", { isPrivate: !this.isPrivate })
  }

  onCopyLinkBtnClick() {
    let url = document.querySelector(".config_container .share_url").value
    document.querySelector(".config_container .share_url").select()
    document.execCommand('copy')
  }

  onShareInputClick(event) {
    event.target.select()
    document.execCommand('copy')
  }

  onStartCustomGameClick() {
    SocketUtil.emit("StartGame", { })
  }

  onQuitCustomGameClick() {
    SocketUtil.emit("LeaveGame", { })
    this.hide()
  }

  onCloseClick() {
    SocketUtil.emit("LeaveGame", { })
    this.hide()
  }

  hide() {
    document.querySelector(".browse_game_menu").style.display = 'none'
    document.querySelector(".game_lobby_menu").style.display = 'none'
  }

  addPlayer(player) {
    this.players[player.id] = player

    let el = this.createPlayerEntry(player)

    this.playerListEl.appendChild(el)
  }

  updateMapScreenshot(dataUrl) {
    document.querySelector("img.selected_map").src = dataUrl
  }

  removePlayer(player) {
    delete this.players[player.id]

    let playerEntry = this.playerListEl.querySelector(".player_entry[data-uid='" + player.id + "'")
    if (playerEntry) {
      playerEntry.parentElement.removeChild(playerEntry)
    }
  }

  show() {
    this.game.goToHomepage()
    document.querySelector(".browse_game_menu").style.display = "none"
    document.querySelector(".game_lobby_menu").style.display = "block"
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerId]
  }

  createPlayerEntry(data) {
    let div = document.createElement("div")
    div.className = "player_entry"
    div.dataset.uid = data.id

    let name = document.createElement("div")
    name.className = "name"
    name.classList.add("col")
    name.innerText = data.name

    let crown = document.createElement("div")
    crown.className = "crown_icon"
    name.appendChild(crown)

    div.appendChild(name)

    return div
  }

}

module.exports = Lobby