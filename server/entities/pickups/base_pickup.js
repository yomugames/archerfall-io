const BaseEntity = require("../base_entity")
const Constants = require("../../../common/constants.json")
const Protocol = require("../../../common/util/protocol")

class BasePickup extends BaseEntity {
  static build(stage, data) {
    data.type = this.prototype.getType()
    return new this(stage, data)
  }

  constructor(stage, options = {}) {
    super(stage, options)

    this.type = this.getType()

    this.onPickupUpdated()
  }

  isArrow() {
    return this.constructor.name.indexOf("Arrow") !== -1
  }

  onPickupUpdated() {
    this.stage.onPickupUpdated(this)
  }

  register() {
    super.register()
    this.stage.addPickup(this)
  }

  unregister() {
    super.unregister()
    this.stage.removePickup(this)
  }


  getDefaultWidth(data) {
    return this.getConstants(data.type).width
  }

  getDefaultHeight(data) {
    return this.getConstants(data.type).height
  }

  isMeleeWeapon() {
    return false
  }

  getConstants(type = this.type) {
    let klassName = Protocol.definition().PickupType[type]
    return Constants.Pickups[klassName]
  }

  remove() {
    super.remove()

    this.onPickupUpdated()
  }

  apply() {
    this.acquired = true
  }

}

module.exports = BasePickup