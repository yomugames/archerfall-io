const Player = require("./player")

class AiBot extends Player {
  constructor(data) {
    super(null, data)

    this.lastPositions = []
  }

  addToGame() {
    this.stage.addPlayer(this)
  }

  getType() {
    return "Player"
  }

  removeFromGame() {
    this.stage.removePlayer(this)
  }

  isBot() {
    return true
  }

  isStuck() {
    let value = this.lastPositions[0]

    return this.lastPositions.every((val) => {
      return val === value
    })
  }

  executeTurn() {
    super.executeTurn()
  }

}

module.exports = AiBot
