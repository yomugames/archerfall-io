const MathHelper = require("./MathHelper") //import MathHelper from "./MathHelper"

const isVector = (v) => {
  return v && !isNaN(v.x) && !isNaN(v.y)
}

const areAllVectors = (...vectors) => {
  let nonVectors = vectors.filter((v) => !isVector(v))
  const areAllVectors = nonVectors.length == 0

  if (!areAllVectors) {
    console.warn("The following elements were not vectors", nonVectors)
  }

  return areAllVectors
}

const subtract = (a, b) => {
  if (!areAllVectors(a, b)) return

  return { x: a.x - b.x, y: a.y - b.y }
}

const add = (a, b) => {
  if (!areAllVectors(a, b)) return

  const added = { x: a.x + b.x, y: a.y + b.y }
  return added
}

const multiply = (a, b) => {
  if (isVector(a) && isVector(b)) {
    return { x: a.x * b.x, y: a.y * b.y }
  }

  if (isNaN(a) && isNaN(b)) {
    console.error("No valid multiplier, options were:", a, b)
    return
  }

  if (!isVector(a) && !isVector(b)) {
    console.error("No valid vector, options were:", a, b)
    return
  }

  const multiplier = isVector(a) ? b : a
  const vector = isVector(a) ? a : b

  return { x: vector.x * multiplier, y: vector.y * multiplier }
}

const magnitude = (v) => {
  if (!isVector(v)) return

  return Math.sqrt(v.x * v.x + v.y * v.y)
}

const normalized = (v) => {
  if (!isVector(v)) return

  const m = magnitude(v)
  if (m === 0) return { x: 0, y: 0 }
  return { x: v.x / m, y: v.y / m }
}

const dot = (a, b) => {
  if (!areAllVectors(a, b)) return

  return a.x * b.x + a.y * b.y
}

const angle = (a, b) => {
  if (!areAllVectors(a, b)) return

  const d = dot(a, b)
  const m = magnitude(a) * magnitude(b)
  if (m === 0) Math.acos(0)
  return Math.acos(d / m)
}

const codirectionality = (a, b) => {
  if (!areAllVectors(a, b)) return

  return Math.cos(angle(a, b))
}

const normalizedDirection = (from, to) => {
  if (!areAllVectors(from, to)) return

  return normalized(subtract(to, from))
}

const distance = (from, to) => {
  if (!areAllVectors(from, to)) return

  return magnitude(subtract(to, from))
}

const centroid = (...points) => {
  if (!points || points.length == 0) {
    console.error("No points provided to centroid", points)
    return null
  }

  let sum = points.reduce(
    (point, sum) => {
      sum = add(sum, point)
      return sum
    },
    { x: 0, y: 0 }
  )

  return { x: sum.x / points.length, y: sum.y / points.length }
}

const clamp = (v, minV, maxV) => {
  if (!areAllVectors(v, minV, maxV)) {
    console.error("Invalid parameters for VectorMath.clamp", v, minV, maxV)
    return v
  }

  return {
    x: MathHelper.clamp(v.x, minV.x, maxV.x),
    y: MathHelper.clamp(v.y, minV.y, maxV.y),
  }
}

module.exports = {
  subtract,
  normalized,
  magnitude,
  normalizedDirection,
  dot,
  angle,
  codirectionality,
  distance,
  multiply,
  add,
  centroid,
  clamp,
}
