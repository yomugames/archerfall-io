class BoltManager {
  constructor() {
    this.takenTiles = {}
  }

  takeTile(row, col) {
    let tile = [row,col].join("-")
    this.takenTiles[tile] = true
  }

  hasBeenTaken(row, col) {
    let tile = [row,col].join("-")
    return this.takenTiles[tile]
  }

}

module.exports = BoltManager