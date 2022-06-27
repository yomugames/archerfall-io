const SocketUtil = require("./../util/socket_util")
const ClientHelper = require("../util/client_helper")
const Config = require("../config")

class BrowseMapMenu {
  constructor(game) {
    this.game = game
    this.main = game.main
    this.el = document.querySelector(".browse_map_menu")
    this.initListeners()
  }

  initListeners() {
    document.querySelector(".browse_map_menu .close_btn").addEventListener("click", this.onCloseClick.bind(this) , true)
    document.querySelector(".browse_map_menu .maps_tab_container").addEventListener("click", this.onMapTabClick.bind(this) , true)
    document.querySelector(".browse_map_menu .my_map_list").addEventListener("click", this.onMapListClick.bind(this) , true)
    document.querySelector(".browse_map_menu .featured_map_list").addEventListener("click", this.onMapListClick.bind(this) , true)
    document.querySelector(".browse_map_menu .new_level_btn").addEventListener("click", this.onNewLevelClick.bind(this) , true)
  }

  onMapListClick(e) {
    let deleteBtn = e.target.closest(".delete_map_btn")
    if (deleteBtn) {
      let levelEntry = e.target.closest(".level_entry")
      this.handleLevelDelete(levelEntry.dataset.uid)
      return
    }

    let levelEntry = e.target.closest(".level_entry")
    if (!levelEntry) return

    this.useMap(levelEntry)
  }

  useMap(levelEntry) {
    SocketUtil.emit("ChangeMap", { uid: levelEntry.dataset.uid })
    this.hide()
  }

  handleLevelDelete(uid) {
    let idToken = this.main.authentication.idToken
    if (!idToken) return

    let result = confirm("Are you sure you want to delete this map?")
    if (result) {

      let body = {
        levelUid: uid,
        idToken: idToken,
        uid: this.main.authentication.uid
      }

      ClientHelper.httpPost(this.getMatchmakerUrl() + "delete_level", body, {
        success: (data) => {
          try {
            let result = JSON.parse(data)
            if (result.error) {
              this.main.displayError({ message: result.error })
            } else {
              this.fetchMyLevels()
            }
          } catch(e) {
            this.main.displayError({ message: "Unable to delete" })
          }
        },
        error: () => {
          this.main.displayError({ message: "Unable to delete" })
        }
      })
    }
  } 

  onMapTabClick(e) {
    let tab = e.target.closest(".map_tab")
    if (!tab) return

    this.selectTab(tab)
  }

  selectTab(tab) {
    let selectedTab = this.el.querySelector(`.map_tab.selected`)
    if (selectedTab) {
      selectedTab.classList.remove("selected")
    }

    let selectedTabContent = this.el.querySelector(`.map_tab_content.active`)
    if (selectedTabContent) {
      selectedTabContent.classList.remove("active")
    }

    tab.classList.add("selected")
    let tabName = tab.dataset.tab

    let tabContent = this.el.querySelector(`.map_tab_content[data-tab='${tabName}']`)
    tabContent.classList.add("active")
  }

  renderMyLevels(result) {
    result.forEach((level) => {
      let entry = this.createLevelEntry(level, { allowDelete: true })
      this.el.querySelector(".my_map_list").appendChild(entry)
    })
  }

  renderFeaturedLevels(result) {
    result.forEach((level) => {
      let entry = this.createLevelEntry(level)
      this.el.querySelector(".featured_map_list").appendChild(entry)
    })
  }

  createLevelEntry(level, options = {}) {
    let el = document.createElement("div")
    el.className = "level_entry"
    el.dataset.uid = level.uid

    let thumbnail = document.createElement("img")
    thumbnail.className = "thumbnail"
    thumbnail.src = level.thumbnail
    el.appendChild(thumbnail)

    let name = document.createElement("div")
    name.className = "level_name"
    name.innerText = level.name
    el.appendChild(name)

    if (options.allowDelete) {
      let deleteMapBtn = document.createElement("div")
      deleteMapBtn.className = "delete_map_btn"
      el.appendChild(deleteMapBtn)
    }

    return el
  }

  fetchMyLevels() {
    this.el.querySelector(".my_map_list").innerHTML = ""
    let idToken = this.main.authentication.idToken
    if (!idToken) return

    let uid = this.main.authentication.uid

    let params = "?idToken=" + idToken + "&uid=" + uid

    ClientHelper.httpRequest(this.getMatchmakerUrl() + "my_levels" + params, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          if (result.error) {
            this.main.displayError({ message: result.error })
          } else {
            this.renderMyLevels(result)
          }
        } catch(e) {

        }
      },
      error: () => {

      }
    })
  }

  fetchFeaturedLevels() {
    this.el.querySelector(".featured_map_list").innerHTML = ""
    ClientHelper.httpRequest(this.getMatchmakerUrl() + "featured_levels", {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          if (result.error) {
            this.main.displayError({ message: result.error })
          } else {
            this.renderFeaturedLevels(result)
          }
        } catch(e) {

        }
      },
      error: () => {

      }
    })
  }

  onNewLevelClick() {
    let idToken = this.main.authentication.idToken
    if (!idToken) {
      this.main.displayError({ message: "Login required" })
      return
    }

    let body = {
      idToken: idToken,
      uid: this.main.authentication.uid
    }

    ClientHelper.httpPost(this.getMatchmakerUrl() + "create_level", body, {
      success: (data) => {
        try {
          let result = JSON.parse(data)
          if (result.error) {
            this.main.displayError({ message: result.error })
          } else {
            this.fetchMyLevels()
          }
        } catch(e) {
          this.main.displayError({ message: "Failed to create map" })
        }
      },
      error: () => {
        this.main.displayError({ message: "Failed to create map" })
      }
    })
  }

  onCloseClick() {
    this.hide()
  }

  show() {
    document.querySelector(".browse_map_menu").style.display = "block"
    this.fetchMyLevels()
    this.fetchFeaturedLevels()
  }

  hide() {
    document.querySelector(".browse_map_menu").style.display = "none"
  }

  getMatchmakerUrl() {
    return Config[env].matchmakerUrl
  }

}

module.exports = BrowseMapMenu