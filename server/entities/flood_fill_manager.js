class FloodFillManager {
  constructor(stage, grid) {
    this.stage = stage
    this.grid = grid
  }

  getRowColKey(tile) {
    return tile.row + "-" + tile.col
  }

  floodFill(options = {}) {
    let row = options.row
    let col = options.col
    let maxDistance = options.maxDistance
    let shouldStop = options.shouldStop

    let visited = {}

    let hit = this.grid.rowColHitTest(row, col)
    hit.distance = 0

    let frontier = [hit]
    visited[this.getRowColKey(hit)] = true

    let tiles = []

    while (frontier.length > 0) {
      hit = frontier.shift()

      if (shouldStop(hit) || hit.distance > maxDistance) {
        continue
      }

      tiles.push(hit)

      let neighbors = this.grid.getNeighborsAllowEmpty(hit.row, hit.col)
      neighbors.forEach((neighborHit) => {
        if (!visited[this.getRowColKey(neighborHit)]) {
          neighborHit.distance = hit.distance + 1
          frontier.push(neighborHit)
          visited[this.getRowColKey(neighborHit)] = true
        }
      })
    }

    return tiles
  }

}

module.exports = FloodFillManager