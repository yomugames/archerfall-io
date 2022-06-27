const Mobs = {}
Mobs.Slime = require("./slime")

Mobs.getList = () => {
  return Object.values(Mobs).filter((klass) => {
    return klass.prototype
  })
}

module.exports = Mobs