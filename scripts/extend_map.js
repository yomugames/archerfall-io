const LevelModel = require("archerfall-common/db/level")

/*
 *  1. need to modify stage.js#exportMap (only include ones within camera view)
 *  2. in this script, remove blocks that are outside camera bounds
 */

const shiftBlocksToRight = (data, xDiff) => {
  if (data.blocks) {
    data.blocks.forEach((entry) => {
      entry.x += xDiff
    })
  }

  if (data.spawnPoints) {
    data.spawnPoints.forEach((entry) => {
      entry.x += xDiff
    })
  }

  if (data.mobSpawners) {
    data.mobSpawners.forEach((entry) => {
      entry.x += xDiff
    })
  }
}


const removeOutOfCameraBlocks = (data) => {
  const minX = 0
  const maxX = data.colCount * 32

  let newData = {
    blocks: [],
    spawnPoints: [],
    mobSpawners: []
  }

  if (data.blocks) {
    data.blocks.forEach((entry) => {
      if (entry.x > minX && entry.x < maxX) {
        newData.blocks.push(entry)
      }
    })
  }

  if (data.spawnPoints) {
    data.spawnPoints.forEach((entry) => {
      if (entry.x > minX && entry.x < maxX) {
        newData.spawnPoints.push(entry)
      }
    })
  }

  if (data.mobSpawners) {
    data.mobSpawners.forEach((entry) => {
      if (entry.x > minX && entry.x < maxX) {
        newData.mobSpawners.push(entry)
      }
    })
  }

  data.blocks = newData.blocks
  data.spawnPoints = newData.spawnPoints
  data.mobSpawners = newData.mobSpawners
}

const expandMap = (data) => {
  let desiredColFor24Row = 42
  let desiredColFor20Row = 34

  if (data.rowCount === 24 && data.colCount < desiredColFor24Row) {
    let numTilesToShiftToRight = (desiredColFor24Row - data.colCount) / 2

    shiftBlocksToRight(data, numTilesToShiftToRight * 32)
    data.colCount = desiredColFor24Row
  } else if (data.rowCount === 20 && data.colCount < desiredColFor20Row) {
    let numTilesToShiftToRight = (desiredColFor20Row - data.colCount) / 2

    shiftBlocksToRight(data, numTilesToShiftToRight * 32)
    data.colCount = desiredColFor20Row
  }

}

const run = async () => {
    let levels = await LevelModel.findAll({
    })

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    let levelData = level.getPublicData()
    let data = levelData.data

    removeOutOfCameraBlocks(data)
    expandMap(data)

    level.data = JSON.stringify(data)
    console.log("saving... " + level.uid)
    await level.save()
    console.log("saved " + level.uid)
  }
}

run()

// during import - min colCount is 34 and min rowCount is 20
