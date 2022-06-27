const PlayerBot = require("./player_bot")
global.env = process.env.NODE_ENV || 'development'

let url = "ws://localhost:8000"
//let url = "wss://game-nyc1-9fdf9957.archerfall.io"
let bots = []

const createBots = async (count) => {
  let botCount = count

  for (var i = 0; i < botCount; i++) {
    let bot = new PlayerBot()
    bot.joinGameServer(url)
    bots.push(bot)
  }

  return bots
}

const run = async () => {
  createBots(500)
}

process.on('SIGINT', () => {
  bots.forEach((bot) => {
    bot.leaveGame()
  })

  bots = []

  process.exit()
})


run()
