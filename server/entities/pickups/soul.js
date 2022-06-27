const BasePickup = require("./base_pickup")
const Protocol = require("../../../common/util/protocol")

class Soul extends BasePickup {
  getType() {
    return Protocol.definition().PickupType.Soul
  }
 
}

module.exports = Soul