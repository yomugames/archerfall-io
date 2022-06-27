const Constants = require('../../../common/constants.json')
const Helper = require('../../../common/helper')

class Interpolator {
  constructor(target) {
    this.target = target
    this.position = target
    
    this.rotationToCover = 0
    this.rotationCovered = 0

    this.position_buffer = []
    this.rotation_buffer = []
    this.expansion_buffer = []

    this.initTimestepFraction()
  }

  static mixin(target) {
    target.interpolator = new Interpolator(target)

    this.defineMethods(target)
  }

  static defineMethods(target) {
    target.setImmediatePosition = (x, y)          => { target.interpolator.setImmediatePosition(x, y) }
    target.instructToMove       = (x, y)          => { target.interpolator.instructToMove(x, y) }
    target.instructToRotate     = (rotation)      => { target.interpolator.instructToRotate(rotation) }
    target.instructToExpand     = (width)         => { target.interpolator.instructToExpand(width) }
    target.interpolate          = (lastFrameTime) => { target.interpolator.interpolate(lastFrameTime) }
    target.interpolateRotation  = (lastFrameTime) => { target.interpolator.interpolateRotation(lastFrameTime) }
    target.interpolateExpansion = (lastFrameTime) => { target.interpolator.interpolateExpansion(lastFrameTime) }
  }

  initTimestepFraction() {
    // 1 timestep === duration of lag
    let millisecondsPerFrame = 16
    let averageLag = 100 // will wait this much before rendering
    let millisecondsPerTimestep = averageLag
    this.timestepFraction = millisecondsPerFrame / millisecondsPerTimestep
  }


  instructToMove(x,y) {
    var timestamp = (new Date()).getTime()

    this.position_buffer.push({
      timestamp: timestamp,
      x: x,
      y: y
    })

  }

  instructToRotate(rotation) {
    let isSameRotation = this.targetRotation === rotation
    if (isSameRotation) return

    this.targetRotation = rotation

    this.rotationToCover = this.angleDeltaSigned(rotation, this.target.rotation)
    this.rotationCovered = 0
  }

  angleDeltaSigned(targetAngleInRad, sourceAngleInRad) {
    // https://stackoverflow.com/questions/2708476/rotation-interpolation
    let endDeg   = targetAngleInRad * 180 / Math.PI
    let startDeg = sourceAngleInRad * 180 / Math.PI
    let shortestAngle = ((((endDeg - startDeg) % 360) + 540) % 360) - 180
    return shortestAngle * Math.PI / 180
  }

  instructToExpand(width) {
    var timestamp = (new Date()).getTime()

    this.expansion_buffer.push({
      timestamp: timestamp,
      width: width
    })

  }

  /*

    x: [20,25]


  */

  getRenderDelay() {
    return game.performanceMonitor.getRenderDelay()
  }

  interpolate(lastFrameTime) {
    const renderDelay = this.getRenderDelay()
    var render_timestamp = lastFrameTime - renderDelay

    // Find the two authoritative positions surrounding the rendering timestamp.
    var buffer = this.position_buffer

    // Drop older positions.
    while (buffer.length > 2 && buffer[1].timestamp <= render_timestamp) {
      buffer.shift()
    }


    // Interpolate between the two surrounding authoritative positions.
    if (buffer.length >= 2 && buffer[0].timestamp <= render_timestamp && render_timestamp <= buffer[1].timestamp) {
      var x0 = buffer[0].x
      var x1 = buffer[1].x
      var y0 = buffer[0].y
      var y1 = buffer[1].y
      var t0 = buffer[0].timestamp
      var t1 = buffer[1].timestamp

      const maxDistanceBeforeConsideredTeleport = Constants.tileSize * 10
      if (Math.abs(x0 - x1) > maxDistanceBeforeConsideredTeleport) {
        x0 = this.accomodateMirroringX(x0, x1)
      } 

      if (Math.abs(y0 - y1) > maxDistanceBeforeConsideredTeleport) {
        y0 = this.accomodateMirroringY(y0, y1)
      } 

      this.position.x = x0 + (x1 - x0) * (render_timestamp - t0) / (t1 - t0)
      this.position.y = y0 + (y1 - y0) * (render_timestamp - t0) / (t1 - t0)
    }
  }

  accomodateMirroringX(x0, x1) {
    const isTeleportingFromLeftToRight = x1 > x0
    const isTeleportingFromRightToLeft = x0 > x1
    if (isTeleportingFromLeftToRight) {
      return x0 + game.colCount * Constants.tileSize
    } else if (isTeleportingFromRightToLeft) {
      return x0 - game.colCount * Constants.tileSize
    }
  }

  accomodateMirroringY(y0, y1) {
    const isTeleportingFromBottomToTop = y1 > y0
    const isTeleportingFromTopToBottom = y0 > y1
    if (isTeleportingFromBottomToTop) {
      return y0 + game.rowCount * Constants.tileSize
    } else if (isTeleportingFromTopToBottom) {
      return y0 - game.rowCount * Constants.tileSize
    }
  }

  interpolateRotation(lastFrameTime) {
    let hasCoveredRotation = this.rotationCovered >= Math.abs(this.rotationToCover) 

    if(hasCoveredRotation && (typeof this.targetRotation !== "undefined")) {
      // stop interpolating
      // this.target.rotation = this.targetRotation
      this.targetRotation = null
      return
    }

    let rotationCoveredThisFrame = this.timestepFraction * this.rotationToCover

    this.rotationCovered += Math.abs(rotationCoveredThisFrame)
    this.target.rotation += rotationCoveredThisFrame
  }


  interpolateExpansion(lastFrameTime) {
    var render_timestamp = lastFrameTime - this.getRenderDelay()

    // Find the two authoritative positions surrounding the rendering timestamp.
    var buffer = this.expansion_buffer

    // Drop older positions.
    while (buffer.length > 2 && buffer[1].timestamp <= render_timestamp) {
      buffer.shift()
    }

    // Interpolate between the two surrounding authoritative positions.
    if (buffer.length >= 2 && buffer[0].timestamp <= render_timestamp && render_timestamp <= buffer[1].timestamp) {
      var width0 = buffer[0].width
      var width1 = buffer[1].width
      var t0 = buffer[0].timestamp
      var t1 = buffer[1].timestamp

      this.target.width = width0 + (width1 - width0) * (render_timestamp - t0) / (t1 - t0)
    }

  }

  setImmediatePosition(x, y) {
    this.position_buffer = []
    this.position.x = x
    this.position.y = y
  }


  pointDistance(x1, y1, x2, y2) {
    var a = x1 - x2
    var b = y1 - y2
    var c = Math.sqrt( a*a + b*b )

    return c
  }

}

module.exports = Interpolator
