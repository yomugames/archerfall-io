const Protocol = require("../../../common/util/protocol")
const BasePickup = require("./base_pickup")

class Dagger extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Dagger
  }

  apply(player) {
    super.apply(player)
    player.setEquip(Protocol.definition().EquipmentType.Dagger)
  }

  isMeleeWeapon() {
    return true
  }
}

module.exports = Dagger