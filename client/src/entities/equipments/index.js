const Protocol = require("../../../../common/util/protocol")

const Equipments = {}

Equipments.Bow = require("./bow")
Equipments.Dagger = require("./dagger")

Equipments.forType = (type) => {
  const klassName = Protocol.definition().EquipmentType[type]
  return Equipments[klassName]
}

module.exports = Equipments