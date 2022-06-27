const SAT = require("sat")
const Constants = require("../../common/constants.json")

class BaseEntity {
  constructor(gameOrStage, options = {}) {
    this.position = new SAT.Vector(options.x || 0, options.y || 0)
    this.lastPosition = this.position

    this.velocity = new SAT.Vector(0, 0)

    this.width = options.width || this.getDefaultWidth(options)
    this.height = options.height || this.getDefaultHeight(options)

    this.children = {}

    if (gameOrStage) {
      let isStage = gameOrStage.game
      if (isStage) {
        this.stage = gameOrStage
        this.registerToGame(gameOrStage.game)
      } else {
        this.stage = gameOrStage.stage
        this.registerToGame(gameOrStage)
      }
    }
  }

  isUntargetable() {
    return false
  }

  getRotation() {
    return 0
  }

  registerToGame(game) {
    this.game = game
    if (!this.game) return

    this.id = this.game.generateEntityId()
    this.register()
    this.onAddedToGame()
  }

  onAddedToGame() {}

  isAlive() {
    return true
  }

  isUnit() {
    return false
  }

  getDefaultWidth() {
    return Constants.tileSize
  }

  getDefaultHeight() {
    return Constants.tileSize
  }

  isStatic() {
    return false
  }

  setPosition(x, y) {
    this.position.x = x
    this.position.y = y
  }

  addPosition(x, y) {
    this.position.x += x
    this.position.y += y
  }

  getType() {
    return this.constructor.name
  }

  register() {
    this.game.registerEntity(this)
  }

  getX() {
    return this.position.x
  }

  getY() {
    return this.position.y
  }

  radToDeg(rad) {
    return (rad * 180) / Math.PI
  }

  getId() {
    return this.id
  }

  remove() {
    this.isRemoved = true
    this.clientMustDelete = true

    this.unsetParent()

    this.unregister()
  }

  unregister() {
    this.game.unregisterEntity(this)
  }

  executeTurn() {}

  setParent(parent) {
    this.parent = parent
    parent.addChild(this)

    this.relativePosition = new SAT.Vector(this.getX() - parent.getX(), this.getY() - parent.getY())
  }

  unsetParent() {
    if (this.parent) {
      this.parent.removeChild(this)
      this.parent = null
    }

    this.relativePosition = null
  }

  addChild(child) {
    this.children[child.getId()] = child
  }

  removeChild(child) {
    delete this.children[child.getId()]
  }

  setXFromVelocity() {
    this.addPosition(this.velocity.x, 0)
  }

  setYFromVelocity() {
    this.addPosition(0, this.velocity.y)
  }

  setLinearVelocity(x, y) {
    this.velocity.x = x
    this.velocity.y = y
  }

  getLastX() {
    return this.lastPosition.x
  }

  getLastY() {
    return this.lastPosition.y
  }

  getLastCol() {
    return Math.floor(this.getLastX() / Constants.tileSize)
  }

  getLastRow() {
    return Math.floor(this.getLastY() / Constants.tileSize)
  }

  recalculatePositionFromParent() {
    if (!this.parent) return

    this.position.x = this.parent.position.x + this.relativePosition.x
    this.position.y = this.parent.position.y + this.relativePosition.y
  }

  recalculateChildPositions() {
    for (let id in this.children) {
      let child = this.children[id]
      child.recalculatePositionFromParent()
    }
  }

  equalsPosition(position) {
    return this.position.x === position.x && this.position.y === position.y
  }

  getPositionCopy() {
    return { x: this.position.x, y: this.position.y }
  }

  dampenVelocity() {}

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  applyFriction() {
    const friction = 2
    const currentSpeed = Math.abs(this.velocity.x)

    let deltaVelocity

    if (currentSpeed > friction) {
      deltaVelocity = -Math.sign(this.velocity.x)
      this.velocity.x += deltaVelocity
    } else {
      this.velocity.x = 0
    }
  }

  applyGravity(gravity) {
    if (this.isStatic()) return
    this.velocity.add(gravity)
  }

  onProjectileHit(projectile) {}

  limitFallVelocity() {
    let maxFallSpeed = this.getMaxFallSpeed()
    if (this.velocity.y < maxFallSpeed) {
      this.velocity.y = maxFallSpeed
    }
  }

  getMaxFallSpeed() {
    return -50
  }

  // pos: top-left point
  getBox(x = this.getX(), y = this.getY(), w = this.getWidth(), h = this.getHeight()) {
    return {
      pos: {
        x: x - w / 2,
        y: y + h / 2,
      },
      w: w,
      h: h,
    }
  }

  getMirrorBox() {
    let box = this.getBox()
    if (this.isCurrentlyOnLeftSideEdge()) {
      box.pos.x += this.stage.getCameraWidth()
    } else {
      box.pos.x -= this.stage.getCameraWidth()
    }

    return box
  }

  getBoundingBox() {
    let box = this.getBox()

    return {
      topLeft: {
        x: box.pos.x,
        y: box.pos.y,
      },
      bottomRight: {
        x: box.pos.x + box.w,
        y: box.pos.y - box.h,
      },
    }
  }

  decelerateHorizontalSpeed() {
    let velocity = this.getLinearVelocity()
    this.setLinearVelocity(this.getCurrentVelocity().x * 0.3, velocity.y)
  }

  getCurrentVelocity() {
    return this.velocity
  }

  getPaddedBoundingBox() {
    let padding = this.getWidth() <= 2 ? 0 : 2
    let box = this.getBox()

    return {
      topLeft: {
        x: box.pos.x + padding,
        y: box.pos.y - padding,
      },
      bottomRight: {
        x: box.pos.x + box.w - padding,
        y: box.pos.y - box.h + padding,
      },
    }
  }

  drawCollision(grid, tileHit) {
    let otherBox
    if (tileHit.entity) {
      otherBox = tileHit.entity.getBox()
    } else {
      otherBox = {
        pos: {
          x: grid.container.getGridRulerTopLeft().x + tileHit.col * Constants.tileSize,
          y: grid.container.getGridRulerTopLeft().y + tileHit.row * Constants.tileSize,
        },
        w: Constants.tileSize,
        h: Constants.tileSize,
      }
    }

    let box = this.getBox()
    box.pos.x = Math.floor(box.pos.x)
    box.pos.y = Math.floor(box.pos.y)
    SocketUtil.broadcast(this.stage.getSocketIds(), "CollisionDetected", { sourceBox: box, otherBox: otherBox })
  }

  getClosestDistanceHit(hits) {
    if (hits.length === 1) return hits[0]

    return hits.sort((a, b) => {
      let distanceA = this.game.distanceBetweenEntity(this, a)
      let distanceB = this.game.distanceBetweenEntity(this, b)
      return distanceA - distanceB
    })[0]
  }

  limitVerticalMovement(grid) {
    if (!this.shouldLimitVerticalMovement()) return

    let hits = grid.search(this.getPaddedBoundingBox())
    hits = hits.filter((hit) => {
      return hit.shouldPossiblyObstruct()
    })

    if (hits.length === 0) {
      this.lastVerticalEdgeHit = null
      return
    }

    if (process.env.DEBUG_COLLISION) {
      this.drawCollision(tileHit)
    }

    let closestHit = this.getClosestDistanceHit(hits)

    this.resetVerticalVelocityPosition(closestHit)
  }

  shouldLimitVerticalMovement() {
    return true
  }

  shouldLimitHorizontalMovement() {
    return true
  }

  limitHorizontalMovement(grid) {
    if (!this.shouldLimitHorizontalMovement()) return

    let hits = grid.search(this.getPaddedBoundingBox())
    hits = hits.filter((hit) => {
      return hit.shouldPossiblyObstruct()
    })

    if (hits.length === 0) {
      this.lastHorizontalEdgeHit = null
      return
    }

    if (process.env.DEBUG_COLLISION) {
      this.drawCollision(tileHit)
    }

    let closestHit = this.getClosestDistanceHit(hits)

    this.resetHorizontalVelocityPosition(closestHit)
  }

  getObstacleCollisionWidth() {
    return this.getWidth()
  }

  getObstacleCollisionHeight() {
    return this.getHeight()
  }

  shouldObstruct(obstacle) {
    return false
  }

  /* optimized version. classes can override this (only run once) per limitVertical */
  shouldPossiblyObstruct() {
    return this.shouldObstruct()
  }

  isInCameraHorizontalBoundary() {
    return this.getCol() >= this.stage.getLastValidCol() || this.getCol() <= this.stage.getFirstValidCol()
  }

  isCurrentlyOnLeftSideEdge() {
    return this.getCol() <= this.stage.getFirstValidCol()
  }

  resetVerticalVelocityPosition(obstacle) {
    const isObstacleSolid = obstacle
    if (isObstacleSolid) {
      if (obstacle.shouldObstruct(this)) {
        this.edgifyBodyPositionVertical(obstacle)

        this.velocity.y = 0

        if (this.lastVerticalEdgeHit !== obstacle) {
          this.onHitEntity(obstacle, { direction: "vertical" })
          this.lastVerticalEdgeHit = obstacle
        }
      }
    } else {
      this.edgifyBodyPositionVertical(obstacle)

      this.velocity.y = 0

      if (this.lastVerticalEdgeHit !== obstacle) {
        this.onHitEntity(obstacle, { direction: "vertical" })
        this.lastVerticalEdgeHit = obstacle
      }
    }
  }

  resetHorizontalVelocityPosition(obstacle) {
    const isObstacleSolid = obstacle
    if (isObstacleSolid) {
      if (obstacle.shouldObstruct(this)) {
        this.edgifyBodyPositionHorizontal(obstacle)

        this.velocity.x = 0

        if (this.lastHorizontalEdgeHit !== obstacle) {
          this.onHitEntity(obstacle, { direction: "horizontal" })
          this.lastHorizontalEdgeHit = obstacle
        }
      }
    } else {
      this.edgifyBodyPositionHorizontal(obstacle)

      this.velocity.x = 0

      if (this.lastHorizontalEdgeHit !== obstacle) {
        this.onHitEntity(obstacle, { direction: "horizontal" })
        this.lastHorizontalEdgeHit = obstacle
      }
    }
  }

  onHitEntity(obstacle, options) {}

  edgifyBodyPositionHorizontal(obstacle) {
    let col = obstacle.getNearestCol(this)
    let isNotMovingX = this.velocity.x === 0
    let obstacleXPos = col * Constants.tileSize + Constants.tileSize / 2

    let isCloserToLeft = isNotMovingX && this.getX() < obstacleXPos
    let isCloserToRight = isNotMovingX && this.getX() > obstacleXPos

    if (this.velocity.x < 0 || isCloserToRight) {
      // push player right
      this.position.x = (col + 1) * Constants.tileSize + this.getWidth() / 2
    } else if (this.velocity.x > 0 || isCloserToLeft) {
      // push player left
      this.position.x = col * Constants.tileSize - this.getWidth() / 2
    }
  }

  edgifyBodyPositionVertical(obstacle) {
    let row = obstacle.getRow()
    if (this.velocity.y > 0) {
      // going up
      this.position.y = row * Constants.tileSize - this.getHeight() / 2
    } else if (this.velocity.y < 0) {
      // going down
      this.position.y = (row + 1) * Constants.tileSize + this.getHeight() / 2
    }
  }

  teleportMainBodyToCenter() {
    let minStageY = this.stage.getCameraDisplacement()
    let maxStageY = this.stage.getCameraDisplacement() + this.stage.getCameraHeight()
    let minStageX = this.stage.getCameraDisplacement()
    let maxStageX = this.stage.getCameraDisplacement() + this.stage.getCameraWidth()

    const rightEdgeX = this.getX() + this.getWidth() / 2
    const leftEdgeX = this.getX() - this.getWidth() / 2

    const topEdgeY = this.getY() + this.getHeight() / 2
    const bottomEdgeY = this.getY() - this.getHeight() / 2

    if (rightEdgeX < minStageX) {
      this.position.x += this.stage.getCameraWidth()
      this.onTeleportToCenter()
    } else if (leftEdgeX > maxStageX) {
      this.position.x -= this.stage.getCameraWidth()
      this.onTeleportToCenter()
    }

    if (topEdgeY < minStageY) {
      this.position.y += this.stage.getCameraHeight()
      this.onTeleportToCenter()
    } else if (bottomEdgeY > maxStageY) {
      this.position.y -= this.stage.getCameraHeight()
      this.onTeleportToCenter()
    }

    this.lastPosition = { x: this.position.x, y: this.position.y }
  }

  onTeleportToCenter() {
    this.onPositionChanged({ isGridPositionChanged: true })
  }

  onPositionChanged() {}

  getRow() {
    return Math.floor(this.position.y / Constants.tileSize)
  }

  getCol() {
    return Math.floor(this.position.x / Constants.tileSize)
  }

  getNearestCol(targetEntity) {
    if (this.getWidth() === Constants.tileSize) {
      return this.getCol()
    } else {
      // get one closest to targetEntity
      let columns = this.getColumns()
      let sortedColumns = columns.sort((a, b) => {
        let distanceA = Math.abs(targetEntity.getCol() - a)
        let distanceB = Math.abs(targetEntity.getCol() - b)
        return distanceA - distanceB
      })
      
      return sortedColumns[0]
    }
  }

  getColumns() {
    let numColumns = this.getWidth() / Constants.tileSize
    let box = this.getBox()

    let columns = []
    let blockPos = box.pos.x + Constants.tileSize / 2
    for (let i = 0; i < numColumns; i++) {
      columns.push(Math.floor(blockPos / Constants.tileSize))
      blockPos += Constants.tileSize
    }

    return columns
  }

  getCircle() {
    return { x: this.getX(), y: this.getY(), radius: this.getWidth() / 2 }
  }

  getRotatedWidth() {
    return this.getWidth()
  }

  getRotatedHeight() {
    return this.getHeight()
  }

  getXRelativeToCamera() {
    return this.getX() - this.stage.getCameraDisplacement()
  }

  getYRelativeToCamera() {
    return this.getY() - this.stage.getCameraDisplacement()
  }

  isVisibleInCamera() {
    let relativeX = this.getXRelativeToCamera()
    if (relativeX < 0) return false
    if (relativeX > this.stage.getCameraWidth()) return false

    return true
  }


  createSatPolygon() {
    let width = this.getWidth()
    let height = this.getHeight()

    let bottomLeftPos = this.getBottomLeftPos()

    const polygon = new SAT.Polygon(bottomLeftPos, [
      new SAT.Vector(0, 0),
      new SAT.Vector(width, 0),
      new SAT.Vector(width, height),
      new SAT.Vector(0, height),
    ])

    return polygon
  }

  getBottomLeftPos() {
    let box = this.getBox()
    return new SAT.Vector(box.pos.x, box.pos.y - box.h)
  }

  getMirrorBottomLeftPos() {
    let box = this.getBox()
    if (this.isCurrentlyOnLeftSideEdge()) {
      return new SAT.Vector(box.pos.x + this.stage.getCameraWidth(), box.pos.y - box.h)
    } else {
      return new SAT.Vector(box.pos.x - this.stage.getCameraWidth(), box.pos.y - box.h)
    }
  }

  getSatPolygon() {
    if (!this.satPolygon) {
      this.satPolygon = this.createSatPolygon()
    }

    this.satPolygon.pos = this.getBottomLeftPos()
    this.satPolygon.setAngle(this.getRotation())

    return this.satPolygon
  }

  getMirrorSatPolygon() {
    let satPolygon = this.getSatPolygon()
    satPolygon.pos = this.getMirrorBottomLeftPos()
    return satPolygon
  }

  getSatCircle() {
    let centerVector = new SAT.Vector(this.getX(), this.getY())
    let radius = this.getCircle().radius
    const circle = new SAT.Circle(centerVector, radius)
    return circle
  }

  getMirrorSatCircle() {
    let x
    if (this.isCurrentlyOnLeftSideEdge()) {
      x = this.getX() + this.stage.getCameraWidth()
    } else {
      x = this.getX() - this.stage.getCameraWidth()
    }

    let centerVector = new SAT.Vector(x, this.getY())
    let radius = this.getCircle().radius
    const circle = new SAT.Circle(centerVector, radius)
    return circle
  }

  isPlayer() {
    return false
  }

  getHitDirection(hitX, hitY) {
    let left = this.getX() - Constants.tileSize / 2
    let right = this.getX() + Constants.tileSize / 2

    let up = this.getY() + Constants.tileSize / 2
    let down = this.getY() - Constants.tileSize / 2

    let distances = [
      { direction: "left", value: Math.abs(left - hitX) },
      { direction: "right", value: Math.abs(right - hitX) },
      { direction: "up", value: Math.abs(up - hitY) },
      { direction: "down", value: Math.abs(down - hitY) },
    ]

    return distances.sort((a, b) => {
      return a.value - b.value
    })[0].direction
  }

  isArrow() {
    return false
  }

  getCoord() {
    return [this.getRow(), this.getCol()]
  }
}

module.exports = BaseEntity
