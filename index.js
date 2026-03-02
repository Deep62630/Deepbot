const mineflayer = require("mineflayer")
const { pathfinder, goals, Movements } = require("mineflayer-pathfinder")
const mcDataLoader = require("minecraft-data")
const Vec3 = require("vec3")

// ================= CONFIG =================

const bot = mineflayer.createBot({
  host: process.env.MC_HOST || "Home9714.aternos.me",
  port: parseInt(process.env.MC_PORT) || 11259,
  username: process.env.MC_USER || "bagad.billa.bot",
  version: "1.21.10"
})

bot.loadPlugin(pathfinder)


// ================= MEMORY =================

let mode = "idle"
let currentTask = null
let taskData = null
let miningStart = null
let minedSoFar = 0
let storageChest = null
let bedPosition = null

// ================= CRASH SAFE =================

process.on("uncaughtException", () => {
  try { bot.chat("um i can't able sorry") } catch {}
})

process.on("unhandledRejection", () => {
  try { bot.chat("um i can't able sorry") } catch {}
})

// ================= SPAWN =================

bot.on("spawn", () => {
  const mcData = mcDataLoader(bot.version)
  const movements = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movements)

  const bed = bot.findBlock({
    matching: b => b.name.includes("bed"),
    maxDistance: 30
  })

  if (bed) bedPosition = bed.position.clone()
})

// ================= COMMANDS =================

bot.on("chat", async (username, message) => {

  try {

    if (message.startsWith("!goto")) {
      const args = message.split(" ")
      const x = parseInt(args[1])
      const y = parseInt(args[2])
      const z = parseInt(args[3])
      await bot.pathfinder.goto(new goals.GoalBlock(x,y,z))
    }

    if (message === "!stop") {
      currentTask = null
      mode = "idle"
      bot.pathfinder.setGoal(null)
      bot.chat("Stopped.")
    }

    if (message === "!setchest") {
      const chest = bot.findBlock({
        matching: b => b.name === "chest",
        maxDistance: 6
      })

      if (!chest) {
        bot.chat("No chest nearby.")
        return
      }

      storageChest = chest.position.clone()
      bot.chat(`Chest set at ${storageChest.x} ${storageChest.y} ${storageChest.z}`)
    }

  } catch {
    bot.chat("um i can't able sorry")
  }
})
// ================= AUTO EAT =================

setInterval(async () => {
  try {
    if (bot.food > 14) return

    const food = bot.inventory.items().find(i =>
      i.name.includes("beef") ||
      i.name.includes("chicken") ||
      i.name.includes("pork") ||
      i.name.includes("mutton") ||
      i.name.includes("bread") ||
      i.name.includes("carrot") ||
      i.name.includes("potato")
    )

    if (!food) {
      bot.chat("I am hungry pls give me food plimmse")
      return
    }

    await bot.equip(food, "hand")
    await bot.consume()

  } catch {
    bot.chat("um i can't able sorry")
  }
}, 5000)


// ================= ARMOR AUTO EQUIP =================

bot.on("playerCollect", async (collector) => {
  if (collector !== bot.entity) return

  try {
    await equipArmor()
    await equipShield()
  } catch {}
})

async function equipArmor() {
  const items = bot.inventory.items()

  const helmet = items.find(i => i.name.includes("helmet"))
  const chestplate = items.find(i => i.name.includes("chestplate"))
  const leggings = items.find(i => i.name.includes("leggings"))
  const boots = items.find(i => i.name.includes("boots"))

  if (helmet) await bot.equip(helmet, "head")
  if (chestplate) await bot.equip(chestplate, "torso")
  if (leggings) await bot.equip(leggings, "legs")
  if (boots) await bot.equip(boots, "feet")
}

async function equipShield() {
  const shield = bot.inventory.items().find(i => i.name.includes("shield"))
  if (!shield) return false
  await bot.equip(shield, "off-hand")
  return true
}


if (message === "strip") {
  mode = "strip"
  bot.chat("Strip mining started")
}

if (message === "branch") {
  mode = "branch"
  bot.chat("Branch mining started")
}

if (message === "idle") {
  mode = "idle"
  bot.chat("Idle mode")
}
// ================= COMBAT SYSTEM =================

setInterval(async () => {
  try {
    const mob = bot.nearestEntity(e =>
      e.type === "mob" &&
      e.position.distanceTo(bot.entity.position) < 6
    )

    if (!mob) return

    if (mob.name === "creeper") {
      await fightCreeper(mob)
      return
    }

    await attackMob(mob)

  } catch {
    bot.chat("um i can't able sorry")
  }
}, 2000)

async function attackMob(mob) {
  const sword = bot.inventory.items().find(i => i.name.includes("sword"))
  const axe = bot.inventory.items().find(i => i.name.includes("axe"))

  if (sword) await bot.equip(sword, "hand")
  else if (axe) await bot.equip(axe, "hand")
  else bot.chat(`${mob.name} near me i don't have sword`)

  await bot.attack(mob)
}

async function fightCreeper(creeper) {
  const distance = bot.entity.position.distanceTo(creeper.position)

  if (distance < 3) {
    const hasShield = await equipShield()
    if (!hasShield) bot.chat("I need shild")
    bot.activateItem()
    setTimeout(() => bot.deactivateItem(), 1000)
  }

  await attackMob(creeper)

  const away = bot.entity.position.offset(
    bot.entity.position.x - creeper.position.x,
    0,
    bot.entity.position.z - creeper.position.z
  )

  bot.pathfinder.setGoal(
    new goals.GoalNear(away.x, away.y, away.z, 3)
  )
}


// ================= ANIMAL HUNT (NO FENCE) =================

const huntMobs = ["cow","pig","chicken","sheep","goat"]

setInterval(async () => {
  try {

    const animal = bot.nearestEntity(e =>
      e.type === "mob" &&
      huntMobs.includes(e.name) &&
      e.position.distanceTo(bot.entity.position) < 6
    )

    if (!animal) return

    const fence = bot.findBlocks({
      matching: b => b.name.includes("fence"),
      maxDistance: 2,
      count: 1,
      point: animal.position
    })

    if (fence.length > 0) return

    await attackMob(animal)

  } catch {}
}, 7000)


// ================= FARMING SYSTEM =================

setInterval(async () => {
  try {

    const crop = bot.findBlock({
      matching: b =>
        (b.name === "wheat" && b.metadata === 7) ||
        (b.name === "carrots" && b.metadata === 7) ||
        (b.name === "potatoes" && b.metadata === 7) ||
        (b.name === "beetroots" && b.metadata === 3) ||
        b.name === "melon",
      maxDistance: 6
    })

    if (!crop) return

    await bot.dig(crop)

  } catch {}
}, 8000)


// ================= IDLE ROAM =================

setInterval(async () => {
  try {

    if (currentTask) return

    const x = bot.entity.position.x + (Math.random() * 10 - 5)
    const z = bot.entity.position.z + (Math.random() * 10 - 5)
    const y = bot.entity.position.y

    bot.pathfinder.setGoal(
      new goals.GoalNear(x, y, z, 2)
    )

  } catch {}
}, 30000)


// ================= RESPAWN =================

bot.on("death", () => {
  bot.chat("I died but no problem.")
})
// ===== EXTRA IMPORTS (add top if not already) =====
const mcData = require('minecraft-data')(bot.version)

// ===== GLOBALS =====
let lastRoam = 0

// ===== AUTO ARMOR =====
async function autoArmor() {
  const armorSlots = ["head","torso","legs","feet"]

  for (let item of bot.inventory.items()) {
    if (item.name.includes("helmet")) await bot.equip(item, "head")
    if (item.name.includes("chestplate")) await bot.equip(item, "torso")
    if (item.name.includes("leggings")) await bot.equip(item, "legs")
    if (item.name.includes("boots")) await bot.equip(item, "feet")
  }
}

// ===== AUTO EAT =====
async function autoEat() {
  if (bot.food < 15) {
    const food = bot.inventory.items().find(i => i.foodPoints)
    if (food) {
      await bot.equip(food, "hand")
      await bot.consume()
    }
  }
}

// ===== CREEPER SHIELD =====
function creeperShield() {
  const creeper = Object.values(bot.entities).find(e =>
    e.name === "creeper" && e.position.distanceTo(bot.entity.position) < 3
  )

  if (creeper) {
    const shield = bot.inventory.items().find(i => i.name.includes("shield"))
    if (shield) {
      bot.equip(shield, "off-hand")
      bot.activateItem()
    } else {
      bot.chat("I need shield")
    }
  }
}

// ===== ANIMAL KILL (NO FENCE) =====
async function huntAnimals() {
  const animals = ["cow","pig","sheep","chicken"]

  const target = Object.values(bot.entities).find(e =>
    animals.includes(e.name) &&
    e.position.distanceTo(bot.entity.position) < 10
  )

  if (target) {
    await bot.pvp.attack(target)
  }
}

// ===== AUTO HARVEST =====
async function harvestCrops() {
  const wheat = mcData.blocksByName.wheat.id

  const block = bot.findBlock({
    matching: wheat,
    maxDistance: 6
  })

  if (block && block.metadata === 7) {
    await bot.dig(block)
    bot.chat("seed")
  }
}

// ===== IDLE ROAM =====
async function idleRoam() {
  const now = Date.now()

  if (mode === "idle" && now - lastRoam > 30000) {
    lastRoam = now

    const x = bot.entity.position.x + Math.floor(Math.random()*10 - 5)
    const z = bot.entity.position.z + Math.floor(Math.random()*10 - 5)
    const y = bot.entity.position.y

    await bot.pathfinder.goto(new goals.GoalBlock(x,y,z))
  }
}

// ===== STRIP MINING =====
async function stripMine() {
  bot.setControlState("forward", true)
  const block = bot.blockAt(bot.entity.position.offset(0,0,1))
  if (block && block.name !== "air") {
    await bot.dig(block)
  }
}

// ===== BRANCH MINING =====
async function branchMine() {
  bot.setControlState("forward", true)
  const block = bot.blockAt(bot.entity.position.offset(1,0,0))
  if (block && block.name !== "air") {
    await bot.dig(block)
  }
}

// ===== MAIN THINK LOOP =====
bot.on("physicTick", async () => {

  try {

    await autoArmor()
    await autoEat()
    creeperShield()

    if (mode === "strip") await stripMine()
    if (mode === "branch") await branchMine()

    await huntAnimals()
    await harvestCrops()
    await idleRoam()

  } catch {}
})
