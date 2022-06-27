const PassableBlock = require("./passable_block")
const Protocol = require("../../../common/util/protocol")

class Wall extends PassableBlock {
    constructor(stage, options) {
        super(stage, options)

        this.color = options.color
    }

    getType() {
        return Protocol.definition().BlockType.Wall
    }

    toExportJson() {
        let data = super.toExportJson()
        data.color = this.color
        return data
    }
}

module.exports = Wall
