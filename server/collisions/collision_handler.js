const SAT = require("sat")

class CollisionHandler {

  constructor(stage) {
    this.stage = stage
  }

  detectUnitCollisions(options) {
    let result = []
    let players = this.detectPlayerCollisions(options)
    let mobs = this.detectMobCollisions(options)

    result = result.concat(players)
    result = result.concat(mobs)

    return result
  }

  detectPlayerCollisions(options) {
    let players = this.stage.getPlayerList()
    let collisions = []

    if (options.sourceEntity.getSpeed() < 30) {
      collisions = this.checkCollisionsSimple(players, options)
    } else {
      collisions = this.checkCollisionsCCD(players, options)
    }

    return collisions
  }

  detectMobCollisions(options) {
    let mobs = this.stage.getMobList()
    let collisions

    if (options.sourceEntity.getSpeed() < 30) {
      collisions = this.checkCollisionsSimple(mobs, options)
    } else {
      collisions = this.checkCollisionsCCD(mobs, options)
    }

    return collisions
  }

  checkCollisionsSimple(entities, options = {}) {
    let sourceEntity = options.sourceEntity
    let results = []

    for (var i = 0; i < entities.length; i++) {
      let entity = entities[i]
      if (!entity.isAlive()) continue
      if (entity.isUntargetable()) continue

      let isAABBIntersect = this.isAABBIntersectEntity(sourceEntity.getBox(), entity)
      if (isAABBIntersect) {
        if (options.exclude) {
          if (options.exclude !== entity) {
            results.push(entity)
            break
          }
        } else {
          results.push(entity)
          break
        }
      }
    }

    return results
  }

  isAABBIntersectEntity(box, entity) {
    if (entity.isInCameraHorizontalBoundary()) {
      let isIntersecting = this.isAABBIntersect(entity.getBox(), box)
      let isMirrorIntersecting = this.isAABBIntersect(entity.getMirrorBox(), box)
      return isIntersecting || isMirrorIntersecting
    } else {
      return this.isAABBIntersect(entity.getBox(), box)
    }
  }

  isAABBIntersect(box, otherBox) {
    // https://gamedev.stackexchange.com/a/913
    this.debugBox(box)
    this.debugBox(otherBox)
    return !(
      otherBox.pos.x > box.pos.x + box.w ||
      otherBox.pos.x + otherBox.w < box.pos.x ||
      otherBox.pos.y < box.pos.y - box.h ||
      otherBox.pos.y - otherBox.h > box.pos.y
    )
  }

  checkCollisionsCCD(entities, options = {}) {
    let results = []

    let isPoint = options.sourceEntity.getDistanceFromLastPosition() === 0
    let linePolygon = options.sourceEntity.getCCDLinePolygon()

    for (var i = 0; i < entities.length; i++) {
      let entity = entities[i]
      if (!entity.isAlive()) continue
      if (entity.isUntargetable()) continue

      if (this.isIntersectingWithEntity(options.sourceEntity, entity, linePolygon, isPoint)) {
        if (options.exclude) {
          if (options.exclude !== entity) {
            results.push(entity)
            break
          }
        } else {
          results.push(entity)
          break
        }
      }
    }

    return results
  }

  getFirstUnitCollidingWithBox(box, exclude = []) {
    if (!box) return null

    const units = [...this.stage.getPlayerList(), ...this.stage.getMobList()].filter((u) => !exclude.includes(u))

    for (const unit of units) {
      if (this.isAABBIntersect(unit.getBox(), box)) return unit
    }

    return null
  }

  getUnitsCollidingWithBox(box, exclude = []) {
    if (!box) return []

    const units = [...this.stage.getPlayerList(), ...this.stage.getMobList()].filter((u) => !exclude.includes(u))

    const collidingUnits = []
    for (const unit of units) {
      if (this.isAABBIntersect(unit.getBox(), box)) collidingUnits.push(unit)
    }

    return collidingUnits
  }

  isIntersectingWithEntity(sourceEntity, entity, linePolygon, isPoint) {
    if (isPoint) {
      return this.isPointIntersecting(sourceEntity, entity)
    } else {
      if (entity.getWidth() === entity.getHeight()) {
        return this.isLineIntersectsCircle(entity, linePolygon)
      } else {
        return this.isLineIntersectsPolygon(entity, linePolygon)
      }
    }
  }

  isPointIntersecting(sourceEntity, entity) {
    let point = new SAT.Vector(sourceEntity.getX(), sourceEntity.getY())
    if (entity.isInCameraHorizontalBoundary()) {
      let isInterescting       =  SAT.pointInCircle(point, entity.getSatCircle())
      let isMirrorInterescting =  SAT.pointInCircle(point, entity.getMirrorSatCircle())
      return isInterescting || isMirrorInterescting
    } else {
      return SAT.pointInCircle(point, entity.getSatCircle())
    }
  }

  isLineIntersectsPolygon(entity, linePolygon) {
    let polygon = entity.getSatPolygon()
    this.debugPolygon(polygon)
    this.debugPolygon(linePolygon)

    if (entity.isInCameraHorizontalBoundary()) {
      let mirrorPolygon = entity.getMirrorSatPolygon()
      this.debugPolygon(mirrorPolygon)
      let isInterescting = SAT.testPolygonPolygon(linePolygon, polygon)
      let isMirrorInterescting = SAT.testPolygonPolygon(linePolygon, mirrorPolygon)
      return isInterescting || isMirrorInterescting
    } else {
      return SAT.testPolygonPolygon(linePolygon, polygon)
    }
  }

  isLineIntersectsCircle(entity, linePolygon) {
    let circle = entity.getSatCircle()
    this.debugCircle(circle)
    this.debugPolygon(linePolygon)

    if (entity.isInCameraHorizontalBoundary()) {
      let mirrorCircle = entity.getMirrorSatCircle()
      this.debugCircle(mirrorCircle)
      let isInterescting = SAT.testPolygonCircle(linePolygon, circle)
      let isMirrorInterescting = SAT.testPolygonCircle(linePolygon, mirrorCircle)
      return isInterescting || isMirrorInterescting
    } else {
      return SAT.testPolygonCircle(linePolygon, circle)
    }
  }

  debugCircle(circle) {
    if (debugMode && process.env.DEBUG) {
      this.stage.broadcastEvent("Debug", {
        mode: "circle",
        points: [{ x: circle.pos.x, y: circle.pos.y }],
        radius: circle.r
      })
    }
  }

  debugBox(box) {
    if (debugMode && process.env.DEBUG) {
      let points = this.getAbsoluteSatBoxPoints(box)
      this.stage.broadcastEvent("Debug", {
        mode: "polygon",
        points: points,
      })
    }
  }

  debugPolygon(polygon) {
    if (debugMode && process.env.DEBUG) {
      let points = this.getAbsoluteSatPolygonPoints(polygon)
      this.stage.broadcastEvent("Debug", {
        mode: "polygon",
        points: points,
      })
    }
  }

  getAbsoluteSatPolygonPoints(polygon) {
    return polygon.calcPoints.map((point) => {
      return { 
        x: point.x + polygon.pos.x,
        y: point.y + polygon.pos.y
      }
    })
  }

  getAbsoluteSatBoxPoints(box) {
    return [
      { x: box.pos.x        , y: box.pos.y },
      { x: box.pos.x        , y: box.pos.y - box.h },
      { x: box.pos.x + box.w, y: box.pos.y - box.h },
      { x: box.pos.x + box.w, y: box.pos.y },
    ]
  }


}

module.exports = CollisionHandler