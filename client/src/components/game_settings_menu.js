const Pickups = require("../entities/pickups/index")

class GameSettingsMenu {
  constructor(game) {
    this.game = game
    this.main = game.main
    this.el = document.querySelector(".game_settings_menu")
    this.initListeners()
    this.populatePickups()
  }

  initListeners() {

  }

  populatePickups() {
    let container = document.querySelector(".game_settings_entry .pickup_list")
    Pickups.getList().forEach((klass) => {
      let el = this.createPickupEl(klass)
      container.appendChild(el)
    })
  }

  createPickupEl(klass) {
      let imagePath = "/assets/images/" + klass.prototype.getSpritePath()
      let img = document.createElement("img")
      img.className = "pickup_entry"
      img.dataset.type = klass.prototype.getType()
      img.src = imagePath
      return img
  }
}

module.exports = GameSettingsMenu