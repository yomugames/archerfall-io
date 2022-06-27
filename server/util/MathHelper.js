const clamp = (value, min, max) => {
  return Math.max(Math.min(value, max), min)
}

const randomInt = (min = 0, max = 10) => {
  // min included / max excluded
  return Math.floor(Math.random() * (max - min)) + min
}

const randomFloat = (min = 0, max = 1) => {
  // both included
  return Math.random() * (max - min) + min
}

module.exports = {
  clamp,
  randomInt,
  randomFloat,
}
