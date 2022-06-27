const BaseEntity = require("../base_entity")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")
const ClientHelper = require("../../util/client_helper")

class Block extends BaseEntity {
  static build(game, data) {
    return new this(game, data)
  }
  
  static equipForBuilding(game, position) {
    const options = {
      position: {
        x: 0,
        y: 0
      },
      isEquipDisplay: true,
    }

    let data = Object.assign({}, options, this.getBuildOptions())

    const block = new this(game, data)
    game.enterBuildMode(block)
    block.renderAtMousePosition(position.x, position.y)
  }

  static getBuildOptions() {
    return {}
  }

  isGround() {
    return false
  }

  isWall() {
    return false
  }

  getDisplaySpritePath() {
    return this.getSpritePath()
  }

  isMovingObject() {
    return false
  }

  registerEntity() {
    super.registerEntity()

    if (this.isMovingObject()) {
      this.game.addMovingObject(this)
    }
  }

  unregisterEntity() {
    super.unregisterEntity()

    if (this.isMovingObject()) {
      this.game.removeMovingObject(this)
    }
  }

  syncWithServer(data) {
    this.instructToMove(data.position.x , data.position.y)
  }

  setColor(color) {
    this.getTintableSprite().tint = ClientHelper.hexToInt(color)
  }

  getTypeName() {
    return Protocol.definition().BlockType[this.getType()] 
  }

  isForeground() {
    return false
  }

  getSpriteContainer() {
    if (this.data.isEquipDisplay) {
      return this.game.app.stage
    } else if (this.isForeground()) {
      return this.game.foregroundContainer
    } else if (this.isGround()) {
      return this.game.groundContainer
    } else {
      return this.game.levelContainer
    }
  }

  constructor(game, data) {
    super(game, data)

    this.type = data.type
    this.isEquipDisplay = data.isEquipDisplay
    this.sprite.name = this.getTypeName()
    this.sprite.scale.y = -this.sprite.scale.y

    if (this.isEquipDisplay) {
      this.sprite.alpha = 0.2
      this.sprite.name = this.getTypeName() + "_Builder"
    }

  }

  renderAtMousePosition(x, y) {
    this.sprite.x = this.game.getSnappedPosX(x, this.getWidth())
    this.sprite.y = this.game.getSnappedPosY(y, this.getHeight())

    // this.renderInvalidArea()
  }

  getGridCoord() {
    return { 
      col: Math.floor(this.sprite.x / Constants.tileSize),
      row: Math.floor(this.sprite.y / Constants.tileSize)
    }
  }

  getDefaultWidth() {
    return Constants.tileSize
  }

  getDefaultHeight() {
    return Constants.tileSize
  }

}

module.exports = Block