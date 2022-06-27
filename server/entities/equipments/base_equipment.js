const Constants = require("../../../common/constants.json")
const Protocol = require("../../../common/util/protocol")

class BaseEquipment {
  static build(user) {
    const type = this.prototype.getType()
    
    return new this(user, type)
  }

  use() {
    if (!this.canUse()) return

    if (this.user.isInvisible()) {
      this.user.removeInvisible()
    }

    this.perform()
    this.setNextUseTimestamp()
  }

  perform() {
    // nothing by default. subclass override
  }

  canUse() {
    return this.game.timestamp >= this.nextUseTimestamp
  }

  setNextUseTimestamp() {
    this.nextUseTimestamp = this.game.timestamp + this.getUseRate()
  }

  getConstants(type = this.getType()) {
    let klassName = Protocol.definition().EquipmentType[type]
    return Constants.Equipments[klassName]
  }

  getRange() {
    return this.getConstants().range || 0
  }

  constructor(user, equipType) {
    this.user = user
    this.equipType = equipType

    this.game = user.game
    this.stage = user.stage

    this.nextUseTimestamp = this.game.timestamp
  }

  getUseRate() {
    return 1
  }

  getType() {
    throw new Error("must implement getType")
  }
}

module.exports = BaseEquipment