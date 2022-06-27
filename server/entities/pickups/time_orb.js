const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class TimeOrb extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.TimeOrb
  }

  apply(player) {
    super.apply(player)

    if (this.stage.isTimeSlowed()) {
      this.stage.stopSlowMotion()
    } else {
      this.stage.startSlowMotion()
    }
  }
}

module.exports = TimeOrb