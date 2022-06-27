const ClientHelper = require("../util/client_helper")
const Config = require("../config")

class Matchmaker {
  constructor(main) {
    this.main = main

    this.initRegions()
    this.initListeners()
  }

  initRegions() {
    if (debugMode) {
      this.regions = [
        { id: 'localhost', name: "localhost"},
        { id: 'test', name: "test"}
      ]
    } else {
      this.regions = [
        { id: 'nyc1', name: "USA"},
        { id: 'fra1', name: "Europe"}
      ]
    }

    let selectOptions = ""

    this.regions.forEach((region) => {
        selectOptions += "<option value='" + region.id + "'>" + region.name + "</option>"
    })

    document.querySelector("#region_select").innerHTML = selectOptions
  }

  renderRegionSelectPlayerCount(onlineCountByRegion) {
    for (let regionName in onlineCountByRegion) {
      let option = document.querySelector("#region_select option[value='" + regionName + "']")
      let onlineCount = onlineCountByRegion[regionName]

      let region = this.regions.find((regionData) => { return regionData.id === regionName })
      if (region) {
        let friendlyRegionName = region.name
        option.innerText = `${friendlyRegionName}`
      }
    }
  }

  renderTotalPlayerCount(totalOnlineCount) {
    document.querySelector(".total_online_count").innerText = totalOnlineCount + " online"
  }

  setRegion(region) {
    this.region = region
  }

  getGameServerList(cb) {
    ClientHelper.httpRequest(this.getServerHttpUrl() + "servers", {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          cb(result)
        } catch(e) {
          console.error(e)
          cb({ error: "Matchmaker error. Servers Unreachable." })
        }
      },
      error: () => {
        cb({ error: "Matchmaker error. Servers Unreachable." })
      }
    })
  }

  findServer(gameUid, cb) {
    ClientHelper.httpRequest(this.getServerHttpUrl() + `find_server?uid=${gameUid}`, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          cb(result)
        } catch(e) {
          console.error(e)
          cb({ error: "Matchmaker error. Servers Unreachable." })
        }
      },
      error: () => {
        cb({ error: "Matchmaker error. Servers Unreachable." })
      }
    })
  }

  connectToNearbyServer(cb) {
    this.getGameServerList((data) => {
      if (data.error) {
        this.main.onPlayerCantJoin({ message: data.error })
        cb()
        return
      }

      this.renderRegionSelectPlayerCount(data.onlineCountByRegion)
      this.renderTotalPlayerCount(data.totalOnlineCount)

      this.findBestRegion(data.serversByRegion, (region) => {
        this.setRegion(region || "nyc1")
        this.onRegionAssigned()
        cb()
      })

    })
  }

  onRegionAssigned() {

  }

  hasServer() {
    if (!this.serversByRegion) return false
  
    const firstRegionServers = Object.values(this.serversByRegion)[0]
    return Object.keys(firstRegionServers).length > 0
  }

  getAvailableServer() {
    if (!this.hasServer()) {
      return new Promise((resolve, reject) => {
        this.connectToNearbyServer(() => {
          resolve(this.getFirstAvailableServer())
        })
      })
    } else {
      return this.getFirstAvailableServer()
    }
  }

  getFirstAvailableServer() {
    if (!this.serversByRegion) return null

    let servers = this.serversByRegion[this.region]
    if (!servers) return null
    let firstServer = Object.keys(servers)[0]
    return firstServer
  }

  initListeners() {
    document.querySelector(".create_custom_game_btn").addEventListener("click", this.onCreateCustomGameClick.bind(this), true)
    document.querySelector(".join_custom_game_btn").addEventListener("click", this.onJoinCustomGameClick.bind(this), true)
    document.querySelector(".refresh_custom_game_btn").addEventListener("click", this.onRefreshCustomGameClick.bind(this), true)
    document.querySelector(".browse_game_menu .game_list").addEventListener("click", this.onGameListClick.bind(this), true)
    document.querySelector(".browse_game_menu .game_list").addEventListener("dblclick", this.onGameListDblClick.bind(this), true)
    document.querySelector(".browse_game_menu .close_btn").addEventListener("click", this.onBrowseGameMenuCloseClick.bind(this), true)
    document.querySelector("#region_select").addEventListener("change", this.onRegionSelectChanged.bind(this), true)
  }

  onRegionSelectChanged(event) {
    this.region = event.target.value
  }

  onBrowseGameMenuCloseClick() {
    document.querySelector(".browse_game_menu").style.display = 'none'
  }

  onCreateCustomGameClick() {
    this.main.onCreateCustomGameClick()
  }

  onJoinCustomGameClick() {
    if (!this.selectedGameEntry) return

    let gameUid = this.selectedGameEntry.dataset.uid
    let ip = this.selectedGameEntry.dataset.ip
    this.main.joinLobby(gameUid, ip)
  }

  onRefreshCustomGameClick() {
    this.fetchGames()
  }

  show() {
    if (this.selectedGameEntry) {
      this.selectedGameEntry.classList.remove("selected")
      this.selectedGameEntry = null
    }

    document.querySelector(".browse_game_menu").style.display = 'block'
    document.querySelector(".join_custom_game_btn").classList.add("disabled")

    this.fetchGames()
  }

  onGameListClick(e) {
    let gameEntry = e.target.closest(".game_entry")
    if (!gameEntry) return

    if (this.selectedGameEntry) {
      this.selectedGameEntry.classList.remove("selected")
    }

    this.selectedGameEntry = gameEntry
    this.selectedGameEntry.classList.add("selected")

    document.querySelector(".join_custom_game_btn").classList.remove("disabled")
  }

  onGameListDblClick(e) {
    let gameEntry = e.target.closest(".game_entry")
    if (!gameEntry) return

    let gameUid = gameEntry.dataset.uid
    let ip = gameEntry.dataset.ip
    this.main.joinLobby(gameUid, ip)
  }

  getServerHttpUrl() {
    return Config[env].matchmakerUrl
  }

  fetchLeaderboard(cb) {
    let url = this.getServerHttpUrl() + "rankings" 
    ClientHelper.httpRequest(url, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          cb(result)
        } catch(e) {
          throw new Error("Failed to fetch rankings")
        }
      },
      error: () => {
        throw new Error("Failed to fetch rankings")
      }
    })
  }

  fetchMyProfile(idToken, uid, cb) {
    let url = this.getServerHttpUrl() + "me?idToken=" + idToken + "&uid=" + uid
    ClientHelper.httpRequest(url, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          cb(result)
        } catch(e) {
          throw new Error("Failed to get user profile")
        }
      },
      error: () => {
        throw new Error("Failed to get user profile")
      }
    })
  }

  fetchGames() {
    ClientHelper.httpRequest(this.getServerHttpUrl() + "game_list", {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          this.renderGames(result)
        } catch(e) {

        }
      },
      error: () => {

      }
    })
  }

  renderGames(games) {
    document.querySelector(".browse_game_menu .game_list").innerHTML = ""

    for (let id in games) {
      let el = this.createGameEntry(games[id])
      document.querySelector(".browse_game_menu .game_list").appendChild(el)
    }

    if (Object.keys(games).length > 0) {
      document.querySelector(".browse_game_menu .empty_state").style.display = 'none'
    } else {
      document.querySelector(".browse_game_menu .empty_state").style.display = 'block'
    }
  }

  createGameEntry(data) {
    let div = document.createElement("div")
    div.className = "game_entry"
    div.dataset.uid = data.id

    div.dataset.ip = data.host

    let name = document.createElement("div")
    name.className = "name"
    name.classList.add("col")
    name.innerText = data.name

    let playerCount = document.createElement("div")
    playerCount.className = "player_count"
    playerCount.classList.add("col")
    playerCount.innerText = data.playerCount + " / 4"

    div.appendChild(name)
    div.appendChild(playerCount)

    return div
  }

  findBestRegion(serversByRegion, cb) {
    this.serversByRegion = serversByRegion
    let pings = {}
    let requests = []
    let counter = Object.keys(serversByRegion).length

    for (let region in serversByRegion) {
      let servers = serversByRegion[region]
      let serverIp = Object.keys(servers)[0]
      if (serverIp) {
        let url = this.main.getServerHTTPUrlForIp(serverIp)
        pings[region] = Date.now()

        let request = ClientHelper.httpRequest(url + "/ping", {
          success: (result) => {
            pings[region] = Date.now() - pings[region]

            counter -= 1
            let isAllServerPinged = counter === 0
            if (isAllServerPinged) {
              // check lowest ping server
              this.isBestRegionFound = true
              let bestRegion = this.getLowestPingRegion(pings)
              cb(bestRegion)
            }
          },
          error: () => {
          }
        })

        requests.push(request)
      }
    }

    // 1 second limit
    setTimeout(() => {
      if (!this.isBestRegionFound) {
        console.log("1 second reached. aborting pings..")
        requests.forEach((xhttp) => {
          let done = 4
          if (xhttp.readyState !== done) {
            xhttp.abort()
          }
        })

        let bestRegion = this.getLowestPingRegion(pings)
        bestRegion = bestRegion || Object.keys(pings)[0]
        cb(bestRegion)
      }
    }, 1000)
  }

  getLowestPingRegion(pings) {
    let lowest = 10000
    let targetRegion

    for (let region in pings) {
      let ping = pings[region]
      console.log("ping: " + region + " - " + ping + " ms")
      if (ping < lowest) {
        targetRegion = region
        lowest = ping
      }
    }

    return targetRegion
  }


}

module.exports = Matchmaker

