const Constants = require('./../constants.json')
const Helper = require('./../helper')

class Grid {
  constructor(name, container, rowCount, colCount, emptyValue = 0) {
    this.name = name
    this.container = container
    this.mapData = []
    this.tileSize = Constants.tileSize

    this.ROW_COUNT    = rowCount
    this.COLUMN_COUNT = colCount
    this.EMPTY_VALUE = emptyValue

    this.init()
  }

  reset() {
    this.mapData = []
    this.init()
  }

  init() {
    for(var row = 0; row < this.ROW_COUNT; row++) {
      this.mapData.push([])
      for(var col = 0; col < this.COLUMN_COUNT; col++) {
        this.mapData[row][col] = this.EMPTY_VALUE
      }
    }
  }

  getNumberGrid() {
    return this.mapData.map((row) => {
      return row.map((col) => {
        return col ? col.getType() : 0
      })
    })
  }

  applyMap(map) {
    for (var row = 0; row < map.length; row++) {
      let rowSection = map[row]
      for(var col = 0; col < rowSection.length; col++) {
        entity = map[row][col]
        if (typeof entity === "function") {
          this.mapData[row][col] = entity()
        } else {
          this.mapData[row][col] = entity
        }
      }
    }
  }

  set(data) {
    if (typeof data.value === "function") {
      this.mapData[data.row][data.col] = data.value()
    } else {
      this.mapData[data.row][data.col] = data.value
    }
  }

  registerTile(row, col, entity) {
    this.mapData[row][col] = entity
  }

  get(row, col) {
    let isRowColNaN = (isNaN(parseInt(row)) || isNaN(parseInt(col)))

    if (this.isOutOfBounds(row, col) || isRowColNaN) {
      return null
    } else {
      return this.mapData[row][col]
    }
  }

  forEachMultiple(startRow, startCol, endRow, endCol, cb) {
    for (var row = startRow; row <= endRow; row++) {
      for (var col = startCol; col <= endCol; col++) {
        let value = this.rowColHitTest(row, col).entity
        cb(row, col, value)
      }
    }
  }

  isRowOutOfBounds(row) {
    return row < 0 || row >= this.ROW_COUNT
  }

  isColumnOutOfBounds(col) {
    return col < 0 || col >= this.COLUMN_COUNT
  }

  isOutOfBounds(row, col) {
    return this.isRowOutOfBounds(row) || this.isColumnOutOfBounds(col)
  }

  isTileEmptyRowCol(row, col) {
    if (this.isOutOfBounds(row, col)) return true

    return this.mapData[row][col] === this.EMPTY_VALUE
  }

  isFullyOccupied(x, y, width, height) {
    let checkFull = true
    return this.isOccupied(x, y, width, height, checkFull)
  }

  isTileOccupied(row, col) {
    return !this.isTileEmptyRowCol(row, col)
  }

  isOccupied(x, y, width, height, checkFull = false) {
    let isOneBlock = (width === this.tileSize && height === this.tileSize)

    if (isOneBlock) {
      const position = this.getTilePosition(x, y)
      if (this.isOutOfBounds(position.row, position.col)) return true

      const isTileFilled = this.mapData[position.row][position.col] !== this.EMPTY_VALUE
      return isTileFilled
    } else {
      const box = {
        pos: {
          x: x - width / 2,
          y: y - height / 2
        },
        w: width,
        h: height
      }

      return checkFull ? this.isBoxFullyOccupied(box) : this.isBoxOccupied(box)
    }
  }


  getTilePosition(x, y) {
    const row = Math.floor(y / this.tileSize)
    const col = Math.floor(x / this.tileSize)

    return {
      row: row,
      col: col
    }
  }

  addToCollection(row, col, entity) {
    let collection = this.mapData[row][col]
    if (!collection) {
      collection = {}
    }

    collection[entity.id] = entity

    this.mapData[row][col] = collection
  }

  removeExisting(box) {
    let hits = this.hitTestTile(box)
    hits.forEach((hit) => {
      if (hit.entity) hit.entity.remove()
    })
  }

  removeTile(row, col) {
    let entity = this.get(row, col)
    if (entity) {
      this.mapData[row][col] = this.EMPTY_VALUE
    }
  }

  removeFromCollection(row, col, entity) {
    let collection = this.mapData[row][col]
    if (collection) {
      delete collection[entity.id]

      if (Object.keys(collection).length > 0) {
        this.mapData[row][col] = collection
      } else {
        this.mapData[row][col] = this.EMPTY_VALUE
      }
    }
  }

  registerToCollection(box, tileable) {
    const tilesOccupied = this.hitTestTile(box)

    tilesOccupied.forEach((tilesOccupied) => {
      let collection = this.mapData[tilesOccupied.row][tilesOccupied.col]
      if (!collection) {
        collection = {}
      }

      collection[tileable.id] = tileable

      this.mapData[tilesOccupied.row][tilesOccupied.col] = collection
    })
  }

  unregisterFromCollection(box, tileable) {
    const tilesOccupied = this.hitTestTile(box)

    tilesOccupied.forEach((tilesOccupied) => {
      let collection = this.mapData[tilesOccupied.row][tilesOccupied.col]
      if (collection) {
        delete collection[tileable.id]

        if (Object.keys(collection).length > 0) {
          this.mapData[tilesOccupied.row][tilesOccupied.col] = collection
        } else {
          this.mapData[tilesOccupied.row][tilesOccupied.col] = this.EMPTY_VALUE
        }
      }
    })
  }

  hitTestTileCollection(box, checkFull = false) {
    let hits = this.hitTestTile(box, checkFull)

    return hits.map((hit) => {
      if (!hit.entity) return [hit]

      let entities = Object.values(hit.entity)
      return entities.map((entity) => {
        return { row: hit.row, col: hit.col , entity: entity }
      })
    }).flat()
  }

  register(box, tileable) {
    const tilesOccupied = this.hitTestTile(box)

    tilesOccupied.forEach((tilesOccupied) => {
      this.mapData[tilesOccupied.row][tilesOccupied.col] = tileable
    })
  }

  unregister(box, tileable) {
    const tilesOccupied = this.hitTestTile(box)

    tilesOccupied.forEach((tilesOccupied) => {
      if (tileable) {
        if (this.mapData[tilesOccupied.row][tilesOccupied.col] === tileable) {
          this.mapData[tilesOccupied.row][tilesOccupied.col] = this.EMPTY_VALUE
        }
      } else {
        this.mapData[tilesOccupied.row][tilesOccupied.col] = this.EMPTY_VALUE
      }
      
    })
  }

  hitTestTile(box, checkFull = false, excludeOutOfBounds = true) {
    let width  = box.w
    let height = box.h

    let topLeftPoint
    let bottomRightPoint

    if (checkFull) {
      topLeftPoint     = { x: box.pos.x         , y: box.pos.y   }
      bottomRightPoint = { x: box.pos.x + width, y: box.pos.y - height }
    } else {
      // i.e if we have 32x32 box that fits exactly on a specific tile,
      // we dont want to consider its 4 corners for hit tests
      // otherwise, it'll match against 9 tiles, instead of just one
      let padding = 2
      topLeftPoint     = { x: box.pos.x         + padding, y: box.pos.y          - padding }
      bottomRightPoint = { x: box.pos.x + width - padding, y: box.pos.y - height + padding }
    }

    let results = this.hitTestRect(topLeftPoint, bottomRightPoint)

    if (excludeOutOfBounds) {
      results = results.filter((hit) => {
        return hit.entity !== null
      })
    }

    return results
  }

  randomTile(boundingBox, excludeBoundingBox) {
    let startCol = Math.floor(boundingBox.minX/this.tileSize)
    let endCol = Math.floor(boundingBox.maxX/this.tileSize)

    let startRow = Math.floor(boundingBox.minY/this.tileSize)
    let endRow = Math.floor(boundingBox.maxY/this.tileSize)

    if (excludeBoundingBox) {
      let excludeStartCol = Math.floor(excludeBoundingBox.minX/this.tileSize)
      let excludeEndCol = Math.floor(excludeBoundingBox.maxX/this.tileSize)

      let excludeStartRow = Math.floor(excludeBoundingBox.minY/this.tileSize)
      let excludeEndRow = Math.floor(excludeBoundingBox.maxY/this.tileSize)

      let row = this.randomBetweenExcluding(startRow, endRow, excludeStartRow, excludeEndRow)
      let col = this.randomBetweenExcluding(startCol, endCol, excludeStartCol, excludeEndCol)

      return this.rowColHitTest(row, col)
    } else {
      let row = this.randomBetweenExcluding(startRow, endRow)
      let col = this.randomBetweenExcluding(startCol, endCol)

      return this.rowColHitTest(row, col)
    }
  }

  randomBetweenExcluding(start, end, excludeStart, excludeEnd) {
    if (excludeStart === start && excludeEnd === end) {
      throw new Error("invalid condition: exclude start/end same as start/end")
    }

    let count = end - start + 1
    let number = start + Math.floor(Math.random() * count)
    if (excludeStart && excludeEnd && number >= excludeStart && number <= excludeEnd) {
      return this.randomBetweenExcluding(start, end, excludeStart, excludeEnd)
    } else {
      return number
    }
  }

  getXY(row, col) {
    const x = (col * this.tileSize) + (this.tileSize / 2)
    const y = (row * this.tileSize) + (this.tileSize / 2)

    return {
      x: x,
      y: y
    }
  }


  hitTest(x, y) {
    var row = Math.floor(y / this.tileSize)
    var col = Math.floor(x / this.tileSize)

    return this.rowColHitTest(row, col)
  }

  rowColHitTest(row, col) {
    let isRowColNaN = (isNaN(parseInt(row)) || isNaN(parseInt(col)))

    if (this.isOutOfBounds(row, col) || isRowColNaN) {
      return { row: row, col: col, entity: null }
    } else {
      return { row: row, col: col, entity: this.mapData[row][col] }
    }
  }

  getDiagonalEdges(box) {
    return {
      upperLeft:  this.hitTest(box.pos.x         + this.tileSize/2, box.pos.y + this.tileSize/2),
      upperRight: this.hitTest(box.pos.x + box.w - this.tileSize/2, box.pos.y + this.tileSize/2),
      lowerLeft:  this.hitTest(box.pos.x         + this.tileSize/2, box.pos.y + box.h - this.tileSize/2),
      lowerRight: this.hitTest(box.pos.x + box.w - this.tileSize/2, box.pos.y + box.h - this.tileSize/2)
    }
  }

  forEach(cb) {
    for(let row = 0; row < this.ROW_COUNT; row++) {
      for(let col = 0; col < this.COLUMN_COUNT; col++) {
        let value = this.mapData[row][col]
        cb(row, col, value)
      }
    }
  }

  count() {
    let result = 0

    this.forEach((row, col, value) => {
      if (value) {
        result += 1
      }
    })

    return result
  }

  hitTestRect(topLeft, bottomRight) {
    var startRow = Math.floor(topLeft.y / this.tileSize)
    var startCol = Math.floor(topLeft.x / this.tileSize)
    var endRow   = Math.floor(bottomRight.y / this.tileSize)
    var endCol   = Math.floor(bottomRight.x / this.tileSize)

    return this.hitTestStartEnd(startRow, startCol, endRow, endCol)
  }

  hitTestStartEnd(startRow, startCol, endRow, endCol, includeOutOfBounds = true, includeMeta = true, includeEmpty = true) {
    // switch end/start if y direction is going up
    if (endRow < startRow) {
      let tempRow = endRow
      endRow = startRow
      startRow = tempRow
    }

    var rowLength = endRow - startRow + 1
    var colLength = endCol - startCol + 1

    var hits = []
    var hit

    for (var y = 0; y < rowLength; y++) {
      for (var x = 0; x < colLength; x++) {
        let row = startRow + y
        let col = startCol + x

        if (this.isRowOutOfBounds(row) || this.isColumnOutOfBounds(col)) {
          if (includeOutOfBounds) {
            hit = includeMeta ? { row: row, col: col, entity: null } : null
            hits.push(hit)
          }
        } else {
          hit = includeMeta ? { row: row, col: col, entity: this.mapData[row][col] } : this.mapData[row][col]
          if (!hit) {
            if (includeEmpty) {
              hits.push(hit)
            }
          } else {
            hits.push(hit)
          }

        }
      }
    }

    return hits
  }

  isLeft(hit, otherHits) {
    return otherHits.every((otherHit) => { return hit.col < otherHit.col })
  }

  isUp(hit, otherHits) {
    return otherHits.every((otherHit) => { return hit.row < otherHit.row })
  }

  isRight(hit, otherHits) {
    return otherHits.every((otherHit) => { return hit.col > otherHit.col })
  }

  isDown(hit, otherHits) {
    return otherHits.every((otherHit) => { return hit.row > otherHit.row })
  }

  normalizeCoord(coord, orientation) {
    if (orientation === "row") {
      var maxCoord = this.ROW_COUNT - 1

      if (coord > maxCoord) coord = maxCoord
    } else {
      // column
      var maxCoord = this.COLUMN_COUNT - 1

      if (coord > maxCoord) coord = maxCoord
    }

    if (coord < 0) coord = 0

    return coord
  }

  isBoxOccupied(box) {
    return this.getOccupancy(box).occupied.length > 0
  }

  getOccupancy(box) {
    const hits = this.hitTestTile(box)
    const occupied = hits.filter((hit) => {
      const noEntityPresent = hit.entity === this.EMPTY_VALUE
      const outOfBoundsIndicator = hit.entity === null

      if (noEntityPresent) {
        return false
      } else if (outOfBoundsIndicator) {
        return true
      } else {
        return true
      }

    })

    return {
      occupied: occupied,
      hits: hits
    }
  }

  isBoxFullyOccupied(box) {
    const occupancy = this.getOccupancy(box)
    const boxTileCount = box.w/Constants.tileSize * box.h/Constants.tileSize

    return occupancy.occupied.length > 0 && occupancy.occupied.length === boxTileCount
  }

  findIntersections(currentBox, hits) {
    return hits.filter((hit) => {
      return hit.entity
    }).filter((hit) => {
      return this.container.isAABBIntersect(currentBox, hit.entity.getBox())
    })
  }

  getVerticallyBumpedTiles(box, velocity, position) {
    const isGoingUp = velocity.y > 0

    let currentTile = this.hitTest(position.x, position.y)

    let rowModifier = isGoingUp ? 1 : -1

    let otherTilesToCheck = [
      this.rowColHitTest(currentTile.row + rowModifier, currentTile.col - 1),
      this.rowColHitTest(currentTile.row + rowModifier, currentTile.col),
      this.rowColHitTest(currentTile.row + rowModifier, currentTile.col + 1)
    ]

    return this.findIntersections(box, otherTilesToCheck.concat(currentTile))
  }

  getHorizontallyBumpedTiles(box, velocity, position) {
    const isGoingRight = velocity.x > 0

    let currentTile = this.hitTest(position.x, position.y)

    let colModifier = isGoingRight ? 1 : -1

    let otherTilesToCheck = [
      this.rowColHitTest(currentTile.row + 1, currentTile.col + colModifier),
      this.rowColHitTest(currentTile.row    , currentTile.col + colModifier),
      this.rowColHitTest(currentTile.row - 1, currentTile.col + colModifier)
    ]

    return this.findIntersections(box, otherTilesToCheck.concat(currentTile))
  }

  setBoundaryDetector(detector) {
    this.boundaryDetector = detector
  }

  search(boundingBox) {
    let startCol = Math.floor(boundingBox.topLeft.x/this.tileSize)
    let endCol = Math.floor(boundingBox.bottomRight.x/this.tileSize)

    let startRow = Math.floor(boundingBox.bottomRight.y/this.tileSize)
    let endRow = Math.floor(boundingBox.topLeft.y/this.tileSize)

    let includeOutOfBounds = false
    let includeMeta = false
    let includeEmpty = false

    let visited = {}
    let unique = []

    let entities = this.hitTestStartEnd(startRow, startCol, endRow, endCol, includeOutOfBounds, includeMeta, includeEmpty)
    entities.forEach((entity) => {
      if (entity) {
        if (!visited[entity.getId()]) {
          visited[entity.getId()] = true
          unique.push(entity)
        }
      }
    })

    return unique
  }

  searchDict(boundingBox) {
    let startCol = Math.floor(boundingBox.minX/this.tileSize)
    let endCol = Math.floor(boundingBox.maxX/this.tileSize)

    let startRow = Math.floor(boundingBox.minY/this.tileSize)
    let endRow = Math.floor(boundingBox.maxY/this.tileSize)

    let includeOutOfBounds = false
    let includeMeta = false
    let includeEmpty = false

    let result = {}

    let entities = this.hitTestStartEnd(startRow, startCol, endRow, endCol, includeOutOfBounds, includeMeta, includeEmpty)
    entities.forEach((entity) => {
      if (entity) {
        result[entity.getId()] = entity
      }
    })

    return result
  }

  searchCollection(boundingBox) {
    let startCol = Math.floor(boundingBox.minX/this.tileSize)
    let endCol = Math.floor(boundingBox.maxX/this.tileSize)

    let startRow = Math.floor(boundingBox.minY/this.tileSize)
    let endRow = Math.floor(boundingBox.maxY/this.tileSize)

    let includeOutOfBounds = false
    let includeMeta = false
    let includeEmpty = false

    let visited = {}
    let unique = []

    let entities = this.hitTestStartEnd(startRow, startCol, endRow, endCol, includeOutOfBounds, includeMeta, includeEmpty)
    entities.forEach((entityMap) => {
      if (entityMap) {
        for (let id in entityMap) {
          let entity = entityMap[id]
          if (!visited[entity.getId()]) {
            visited[entity.getId()] = true
            unique.push(entity)
          }
        }
      }
    })

    return unique
  }

  isBoundary(hit) {
    // use custom detector if present
    if (this.boundaryDetector) return this.boundaryDetector(hit)

    if (hit.entity === 0) return false   // empty space
    if (hit.entity === null) return true // out of bounds

    return hit.entity.isStatic()
  }

  // order is different from left/top/right/down. WARNING
  getNeighbors(row, col) {
    return [
      this.rowColHitTest(row - 1, col    ), // top
      this.rowColHitTest(row    , col - 1), // left
      this.rowColHitTest(row + 1, col    ), // down
      this.rowColHitTest(row    , col + 1)  // right
    ].filter((hit) => {
      return hit.entity // must be present
    })
  }

  getNeighborsWithDiagonal(row, col) {
    return [
      this.rowColHitTest(row - 1, col    ), // top
      this.rowColHitTest(row - 1, col - 1), // topleft
      this.rowColHitTest(row    , col - 1), // left
      this.rowColHitTest(row + 1, col - 1), // leftdown
      this.rowColHitTest(row + 1, col    ), // down
      this.rowColHitTest(row + 1, col + 1), // downright
      this.rowColHitTest(row    , col + 1), // right
      this.rowColHitTest(row - 1, col + 1)  // righttop
    ].filter((hit) => {
      return hit.entity // must be present
    })
  }

  getNeighborsAllowEmpty(row, col) {
    return [
      this.rowColHitTest(row    , col - 1), // left
      this.rowColHitTest(row - 1, col    ), // top
      this.rowColHitTest(row    , col + 1), // right
      this.rowColHitTest(row + 1, col    )  // down
    ]
  }

  raycast(x1, y1, x2, y2, maxLength, entity) {
    let result = []

    result = result.concat(this.raycastHorizontal(x1, y1, x2, y2, maxLength, entity))
    result = result.concat(this.raycastVertical(x1, y1, x2, y2, maxLength, entity))

    return result
  }

  /*
    https://www.permadi.com/tutorial/raycast/rayc7.html
    x1,y1 - source
    x2,y2 - target
  */
  raycastVertical(x1, y1, x2, y2, maxLength, entity) {
    let obstacles = []

    maxLength = maxLength || this.tileSize * this.ROW_COUNT // default is map width

    if (x2 - x1 === 0) return obstacles

    let slope = (y2 - y1) / (x2 - x1)
    let radian = Math.atan2(y2 - y1, x2 - x1)
    let absAngle = Math.abs(radian)
    let dx, dy, stepX, stepY
    let isOutOfBounds = false
    let obstacle = null

    // step 1: find dx + dy
    let directionX = Math.sign(Math.cos(radian))
    let directionY = Math.sign(Math.sin(radian))
    let margin = 1 // we dont want the point on edge of grid, but a little bit extended into the inside of it

    if (directionX === -1) {
      dx = -(x1 - (Math.floor(x1 / this.tileSize) * this.tileSize) + margin)
    } else {
      dx = (Math.ceil(x1 / this.tileSize) * this.tileSize) - x1 + margin
    }

    if (y2 - y1 === 0) {
      dy = 0
    } else {
      dy = (dx * slope) + (margin * directionY)
    }

    // step 2: find 1st intersection
    let intersection = [x1 + dx, y1 + dy]

    // step 3: find stepX, stepY
    stepX = this.tileSize * directionX
    stepY = stepX * slope
    let stepDistance = Math.abs(stepX / Math.cos(radian))
    let currCol = Math.floor(y1 / this.tileSize)
    let iteration = 0
    let extension = 0
    let distance = 0

    // step 4: check for grid intersections
    // check current source x,y as well
    let sourceRow = Math.floor(y1 / this.tileSize)
    let sourceCol = Math.floor(x1 / this.tileSize)
    if (!this.isOutOfBounds(sourceRow, sourceCol)) {
      obstacle = this.mapData[sourceRow][sourceCol]
      if (obstacle && obstacle.shouldObstruct(entity)) {
        obstacles.push({ x: x1, y: y1, entity: obstacle, distance: 0 })
      }
    }

    while (extension + stepDistance < maxLength) {
      iteration += 1
      distance += Helper.distance(0, 0, stepX, stepY)

      let row = Math.floor(intersection[1] / this.tileSize)
      let col = Math.floor(intersection[0] / this.tileSize)
      isOutOfBounds   = this.isOutOfBounds(row, col)

      if (isOutOfBounds) {
        break
      }

      obstacle = this.mapData[row][col]

      if (obstacle && obstacle.shouldObstruct(entity)) {
        obstacles.push({ x: intersection[0], y: intersection[1], entity: obstacle, distance: distance })
        break
      }

      // next iteration
      intersection[0] += stepX
      intersection[1] += stepY

      extension += stepDistance
    }

    return obstacles
  }

  /*
    https://www.permadi.com/tutorial/raycast/rayc7.html
    x1,y1 - source
    x2,y2 - target
  */
  raycastHorizontal(x1, y1, x2, y2, maxLength, entity) {
    let obstacles = []

    maxLength = maxLength || this.tileSize * this.ROW_COUNT // default is map width

    if (y2 - y1 === 0) return obstacles

    let slope = (y2 - y1) / (x2 - x1)
    let radian = Math.atan2(y2 - y1, x2 - x1)
    let absAngle = Math.abs(radian)
    let dx, dy, stepX, stepY
    let isOutOfBounds = false
    let obstacle = null

    // step 1: find dx + dy
    let directionY = Math.sign(Math.sin(radian))
    let margin = 1 // we dont want the point on edge of grid, but a little bit extended into the inside of it

    if (directionY === -1) {
      dy = -(y1 - (Math.floor(y1 / this.tileSize) * this.tileSize) + margin)
    } else {
      dy = (Math.ceil(y1 / this.tileSize) * this.tileSize) - y1 + margin
    }

    if (x2 - x1 === 0) {
      dx = 0
    } else {
      dx = dy / slope + Math.sign(Math.cos(absAngle)) * margin
    }
    

    // step 2: find 1st intersection
    let intersection = [x1 + dx, y1 + dy]

    // step 3: find stepX, stepY
    stepY = this.tileSize * directionY
    stepX = stepY / slope
    let stepDistance = Math.abs(stepY / Math.sin(radian))
    let currRow = Math.floor(y1 / this.tileSize)
    let iteration = 0
    let extension = 0
    let distance = 0

    // step 4: check for grid intersections
    // check current source x,y as well
    let sourceRow = Math.floor(y1 / this.tileSize)
    let sourceCol = Math.floor(x1 / this.tileSize)
    if (!this.isOutOfBounds(sourceRow, sourceCol)) {
      obstacle = this.mapData[sourceRow][sourceCol]
      if (obstacle && obstacle.shouldObstruct(entity)) {
        obstacles.push({ x: x1, y: y1, entity: obstacle, distance: 0 })
      }
    }

    while (extension + stepDistance < maxLength) {
      iteration += 1
      distance += Helper.distance(0, 0, stepX, stepY)

      let row = Math.floor(intersection[1] / this.tileSize)
      let col = Math.floor(intersection[0] / this.tileSize)
      isOutOfBounds   = this.isOutOfBounds(row, col)

      if (isOutOfBounds) {
        break
      }

      obstacle = this.mapData[row][col]

      if (obstacle && obstacle.shouldObstruct(entity)) {
        obstacles.push({ x: intersection[0], y: intersection[1], entity: obstacle, distance: distance })
        break
      }

      // next iteration
      intersection[0] += stepX
      intersection[1] += stepY

      extension += stepDistance
    }

    return obstacles
  }

  getRowCount() {
    return this.ROW_COUNT
  }

  getColCount() {
    return this.COLUMN_COUNT
  }

}

module.exports = Grid
