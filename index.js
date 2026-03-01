const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin

const { GoalFollow, GoalBlock } = goals

function createBot() {

  const bot = mineflayer.createBot({
    host: 'Home9714.aternos.me',
    port: 11259,
    username: 'GuardBot_' + Math.floor(Math.random() * 1000),
    version: false // auto detect
  })

  bot.loadPlugin(pathfinder)
  bot.loadPlugin(pvp)

  bot.once('spawn', () => {
    console.log("Bot joined the server!")

    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)
    bot.pathfinder.setMovements(defaultMove)

    // Anti AFK
    setInterval(() => {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 500)
    }, 30000)
  })

  // Chat Commands
  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    const player = bot.players[username]
    if (!player || !player.entity) return

    // Follow command
    if (message === "!follow") {
      bot.chat("Following you!")
      bot.pathfinder.setGoal(new GoalFollow(player.entity, 2), true)
    }

    // Stop command
    if (message === "!stop") {
      bot.chat("Stopping.")
      bot.pathfinder.setGoal(null)
      bot.pvp.stop()
    }

    // Guard command
    if (message === "!guardme") {
      bot.chat("Guarding you!")
      bot.pathfinder.setGoal(new GoalFollow(player.entity, 2), true)

      bot.on("physicTick", () => {
        const mob = bot.nearestEntity(e =>
          e.type === "mob" &&
          e.position.distanceTo(player.entity.position) < 8
        )
        if (mob) {
          bot.pvp.attack(mob)
        }
      })
    }

    // Goto command
    if (message.startsWith("!goto")) {
      const args = message.split(" ")
      if (args.length === 4) {
        const x = parseInt(args[1])
        const y = parseInt(args[2])
        const z = parseInt(args[3])
        bot.chat("Going there!")
        bot.pathfinder.setGoal(new GoalBlock(x, y, z))
      }
    }
  })

  bot.on('kicked', console.log)
  bot.on('error', console.log)

  // Auto reconnect
  bot.on('end', () => {
    console.log("Disconnected. Reconnecting in 5 seconds...")
    setTimeout(createBot, 5000)
  })
}

createBot()

// Keep alive (for free hosts)
const http = require("http")
http.createServer((req, res) => {
  res.writeHead(200)
  res.end("Bot is alive")
}).listen(3000)
