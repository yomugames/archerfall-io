const Block = require("./block")
const Protocol = require("../../../common/util/protocol")

class Ground extends Block {

  constructor(stage, options) {
    super(stage, options)

    this.color = options.color || "#555555"
  }

  getType() {
    return Protocol.definition().BlockType.Ground
  }

  toExportJson() {
    let data = super.toExportJson()
    data.color = this.color
    return data
  }

}

module.exports = Ground