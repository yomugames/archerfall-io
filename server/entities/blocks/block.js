const BaseEntity = require("../base_entity")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")

class Block extends BaseEntity {
  static build(stage, data) {
    return new this(stage, data)
  }

  constructor(stage, data) {
    super(stage, data)

    this.type = this.getType()
  }

  getTypeName() {
    return Protocol.definition().BlockType[this.type]
  }

  register() {
    super.register()

    if (this.isMovingObject()) {
      this.stage.addMovingObject(this)
    } else {
      this.stage.addStaticObject(this)
    }

    if (this.isProcessor()) {
      this.stage.addProcessor(this)
    }

    if (this.isTemporary()) {
      this.stage.addTemporary(this)
    }
  }

  unregister() {
    super.unregister()

    if (this.isMovingObject()) {
      this.stage.removeMovingObject(this)
    } else {
      this.stage.removeStaticObject(this)
    }

    if (this.isProcessor()) {
      this.stage.removeProcessor(this)
    }

    if (this.isTemporary()) {
      this.stage.removeTemporary(this)
    }
  }

  isTemporary() {
    return false
  }

  executeTurn() {}

  isProcessor() {
    return false
  }

  isMovingObject() {
    return false
  }

  isSpawnPoint() {
    return false
  }

  isMobSpawner() {
    return false
  }

  isStatic() {
    return true
  }

  getDefaultWidth() {
    return Constants.tileSize
  }

  getDefaultHeight() {
    return Constants.tileSize
  }

  remove() {
    super.remove()
    this.stage.onStaticObjectUpdated(this)
  }

  isSuitableForPickup() {
    return this.shouldObstruct() && !this.isLava() && !this.isJumpPad()
  }

  shouldObstruct(obstacle) {
    return true
  }

  isLava() {
    return false
  }

  isJumpPad() {
    return false
  }

  toJson() {
    return {
      x: this.getX(),
      y: this.getY(),
      type: this.getType(),
    }
  }

  toExportJson() {
    return {
      x: this.getXRelativeToCamera(),
      y: this.getYRelativeToCamera(),
      type: this.getType(),
    }
  }
}

module.exports = Block
