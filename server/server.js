global.env = process.env.NODE_ENV || "development"

const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const base64id = require("base64id")
const path = require("path")
const fs = require("fs")
const http = require("http")
const net = require("net")
const uws = require("uWebSockets.js")
const Faker = require("faker")
const RemoteEventHandler = require("./entities/remote_event_handler")
const Game = require("./entities/game")
const Constants = require("../common/constants.json")
const BadWordsFilter = require("./util/bad_words_filter")
const Player = require("./entities/player")
const LevelMap = require("./entities/level_map")
const queryString = require("querystring")
const FirebaseAdminHelper = require("./util/firebase_admin_helper")
const User = require("archerfall-common/db/user")
const LevelModel = require("archerfall-common/db/level")
const Sequelize = require("sequelize")
const Op = Sequelize.Op

global.appRoot = path.resolve(__dirname + "/../")

debugMode = env === "development" ? true : false

if (debugMode) {
    let protocolContents = require("child_process").execSync("cat common/app.proto").toString()
    global.protocolHash = require("crypto").createHash("md5").update(protocolContents).digest("hex").substring(0, 8)
}

const ExceptionReporter = require("./util/exception_reporter")
const Protocol = require("../common/util/protocol")
const SocketUtil = require("./util/socket_util")
const Projectiles = require("./entities/projectiles/index")
const ObjectPool = require("../common/util/object_pool")
const MatchmakerClient = require("./matchmaker_client")

class Server {
    constructor() {
        this.stats = {}
        this.games = {}
        this.matchQueue = []
        this.joinableGames = {}
        this.playerNames = {}
        this.currentMapIndex = 0
        this.maps = {}

        this.MAX_PLAYERS_PER_GAME = 4

        this.initConstants()
        this.initObjectPools()

        FirebaseAdminHelper.init()
        ExceptionReporter.init()
    }

    initConstants() {
        this.FPS = Constants.physicsTimeStep
        this.FRAMES_PER_SECOND = this.FPS
        this.PHYSICS_DURATION = 1000 / this.FRAMES_PER_SECOND
    }

    initObjectPools() {
        let projectileKlasses = Projectiles.getList()
        projectileKlasses.forEach((klass) => {
            let projectileName = klass.name
            ObjectPool.create(projectileName, klass)
        })
    }

    async run() {
        this.fetchServerInfo()

        if (debugMode) {
            this.initDevelopmentAppServer()
        }

        this.assignServerIp()
        this.allocatePort()

        if (!debugMode) {
            this.systemdIndex = this.getSystemdServiceIndex()
        }

        await this.loadMaps()

        this.determineDebugPort()
        this.initMatchmakerClient()

        this.initProtocol(() => {
            this.initWebsocketServer()
            this.initRemoteEventHandler()
            this.startLoop()
        })

        this.initLivenessProbeServer()
    }

    initMatchmakerClient() {
        this.matchmakerClient = new MatchmakerClient(this)
        this.matchmakerClient.connect()
    }

    assignServerIp() {
        if (env === "development") {
            this.SERVER_IP = "localhost"
        } else {
            this.SERVER_IP = process.env.IP_ADDRESS
        }
    }

    allocatePort() {
        this.APP_SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000
    }

    getSystemdServiceIndex() {
        let systemctlStatus = require("child_process").execSync(`systemctl status ${process.pid}`).toString()
        const regex = new RegExp(`archer-io@(\\d+).service`)
        let index = systemctlStatus.match(regex)[1]
        return index
    }

    determineDebugPort() {
        if (debugMode) return

        try {
            let result = require("child_process").execSync(`lsof -p ${process.pid} | grep LISTEN`).toString()
            this.debugPort = result.match(/localhost:(\d+)/)[1]
        } catch (e) {
            ExceptionReporter.captureException(e)
        }
    }

    initProtocol(onReady) {
        Protocol.initServer(function (error, protocol) {
            if (error) {
                console.log("Unable to load network protocol definition")
                throw error
                return
            }

            SocketUtil.init({ protocol: protocol })
            onReady()
        })
    }

    initDevelopmentAppServer() {
        const app = express()
        app.use(cors())
        app.use(bodyParser.json())
        app.use(express.static("client/dist"))
        app.set("views", "./client")
        app.set("view engine", "ejs")

        let gameVersion = fs.readFileSync("VERSION.txt", "utf8").replace("\n", "")
        let language = "en"

        app.get("/", (req, res) => {
            let locals = {
                nodeEnv: env,
                gameVersion: gameVersion,
                revision: this.gameRevision,
                protocolHash: protocolHash,
                language: language,
                assetPath: (path) => {
                    return path
                },
                t: (key, options) => {
                    return i18n.t(language, key, options)
                },
            }

            res.render("index", locals)
        })

        this.appServer = http.Server(app)
        this.appServer.listen(8001, () => {
            console.log("server listening on " + 8001)
        })
    }

    fetchServerInfo() {
        this.REGION = process.env.REGION || "localhost"
        if (debugMode) {
            this.gameRevision = require("child_process").execSync("git rev-parse --short=7 HEAD").toString().trim()
        } else {
            this.gameRevision = require("fs")
                .readFileSync(appRoot + "/revision.txt", "utf8")
                .trim()
        }
        this.gameVersion = require("fs")
            .readFileSync(appRoot + "/VERSION.txt", "utf8")
            .replace(".alpha", "")
            .trim()
    }

    getVersion() {
        return this.gameVersion
    }

    getRevision() {
        return this.gameRevision
    }

    getRegion() {
        return this.REGION
    }

    initWebsocketServer() {
        let app

        if (debugMode) {
            app = uws.App()
        } else {
            app = uws.SSLApp({
                key_file_name: `/var/secrets/ssl/tls.key`,
                cert_file_name: `/var/secrets/ssl/tls.crt`,
            })
        }

        app.ws("/*", {
            maxPayloadLength: 4 * 1024 * 1024,
            idleTimeout: 60,
            open: (ws, req) => {
                SocketUtil.registerSocket(ws)
            },
            message: (ws, message, isBinary) => {
                if (isBinary) {
                    SocketUtil.onMessage(ws, message)
                } else {
                    SocketUtil.onTextMessage(ws, message)
                }
            },
            close: (ws, code, message) => {
                ws.isClosed = true
                SocketUtil.unregisterSocket(ws)
                this.onClientDisconnect(ws)
            },
        })

        app.get("/ping", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")
            res.end("pong")
        })

        app.get("/maps", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")

            let result = {}

            for (let id in this.maps) {
                let map = this.maps[id]
                result[id] = map.toMatchmakerJson()
            }

            res.end(JSON.stringify(result))
        })

        app.get("/stats", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")

            let result = {
                playerCount: this.getPlayerCount(),
            }
            res.end(JSON.stringify(result))
        })

        app.get("/report", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")

            let result = {
                memory: this.getMemoryUsageInMB(),
                games: this.getGameReport(),
            }
            res.end(JSON.stringify(result))
        })

        app.options("/save_map", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
            res.writeHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
            res.end()
        })

        app.post("/save_map", async (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")

            this.readJson(res).then(async (body) => {
                try {
                    let gameUid = body.gameUid
                    let idToken = body.idToken
                    let uid = await this.getUidFromRequest(idToken, body.uid)
                    if (!uid) {
                        let data = { error: "Invalid user id" }
                        res.end(JSON.stringify(data))
                        return
                    }

                    let userModel = await User.findOne({ where: { uid: uid } })
                    if (!userModel) {
                        let data = { error: "No such user" }
                        res.end(JSON.stringify(data))
                        return
                    }

                    let game = this.games[gameUid]
                    if (!game) {
                        let data = { error: "Map not found" }
                        res.end(JSON.stringify(data))
                        return
                    }

                    let result = await game.stage.saveMap({
                        userUid: uid,
                    })

                    if (result) {
                        res.end(JSON.stringify({ success: result }))
                    } else {
                        let data = { error: "Unable to save map" }
                        res.end(JSON.stringify(data))
                    }
                } catch (e) {
                    ExceptionReporter.captureException(e)
                    let data = { error: "Save map failed" }
                    res.end(JSON.stringify(data))
                }
            })
        })

        app.get("/export_map", (res, req) => {
            res.writeHeader("Access-Control-Allow-Origin", "*")
            res.writeHeader("Content-Type", "text/plain")

            try {
                res.onAborted(() => {
                    this.onAbortedOrFinishedResponse(res)
                })

                let query = queryString.decode(req.getQuery())
                let gameUid = query.game_uid

                let game = this.games[gameUid]
                if (!game) {
                    let data = { error: "Export map failed" }
                    res.end(JSON.stringify(data))
                    return
                }

                let result = game.stage.exportMap()
                let buffer = JSON.stringify(result)

                res.end(buffer)
            } catch (e) {
                ExceptionReporter.captureException(e)
                let data = { error: "Export map failed" }
                res.end(JSON.stringify(data))
            }
        })

        app.listen(this.APP_SERVER_PORT, (token) => {
            if (token) {
                console.log("Gameserver listening to port " + this.APP_SERVER_PORT)
            } else {
                console.log("Gameserver failed to listen to port " + this.APP_SERVER_PORT)
            }
        })

        for (let eventName in Protocol.definition().MessageWrapper.fields) {
            SocketUtil.on(eventName, this.onSocketMessage.bind(this, eventName))
        }
    }

    onAbortedOrFinishedResponse(res, readStream) {
        if (res.id == -1) {
            console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!")
        } else {
            if (readStream) {
                readStream.destroy()
            }
        }

        /* Mark this response already accounted for */
        res.id = -1
    }

    readJson(res) {
        return new Promise((resolve, reject) => {
            let buffer

            res.onAborted(() => {
                /* Request was prematurely aborted or invalid or missing, stop reading */
                console.log("Invalid JSON or no data at all!")
            })

            res.onData((ab, isLast) => {
                let chunk = Buffer.from(ab)
                if (isLast) {
                    let json
                    if (buffer) {
                        try {
                            json = JSON.parse(Buffer.concat([buffer, chunk]))
                        } catch (e) {
                            /* res.close calls onAborted */
                            ExceptionReporter.captureException(e)
                            res.close()
                            return
                        }
                        resolve(json)
                    } else if (chunk.length > 0) {
                        try {
                            json = JSON.parse(chunk)
                        } catch (e) {
                            /* res.close calls onAborted */
                            ExceptionReporter.captureException(e)
                            res.close()
                            return
                        }
                        resolve(json)
                    }
                } else {
                    if (buffer) {
                        buffer = Buffer.concat([buffer, chunk])
                    } else {
                        buffer = Buffer.concat([chunk])
                    }
                }
            })
        })
    }

    startLoop() {
        setInterval(this.mainLoop.bind(this), this.PHYSICS_DURATION)
    }

    getGameReport() {
        let result = {}

        for (let id in this.games) {
            let game = this.games[id]
            let playerCount = game.getPlayerCount()
            result[id] = { playerCount: playerCount }
        }

        return result
    }

    mainLoop() {
        this.beginMeasure("tick")

        try {
            this.gameLoop()
            this.reportPerformance()
        } catch (e) {
            ExceptionReporter.captureException(e)
        }

        this.endMeasure("tick")

        this.matchmakerClient.sendHeartbeat()
    }

    gameLoop() {
        this.executeTurn()

        for (let id in this.games) {
            let game = this.games[id]
            game.executeTurn()
        }
    }

    executeTurn() {
        this.processMatchQueue()
    }

    reportPerformance() {
        let threeSecond = 3000
        let canCheckMemory = !this.lastMemoryCheckTime || Date.now() - this.lastMemoryCheckTime > threeSecond
        if (!canCheckMemory) return

        this.reportMemoryPerformance()

        this.lastMemoryCheckTime = Date.now()
    }

    getMemoryUsageInMB() {
        let memoryUsage = process.memoryUsage().rss
        return Math.round(memoryUsage / 1000000)
    }

    reportMemoryPerformance() {
        this.getStat("memory").usage = this.getMemoryUsageInMB()

        let memoryThreshold = 1000
        if (this.getStat("memory").usage > memoryThreshold) {
            this.memoryHighCount += 1
            let seconds = 10 // 30 seconds due to above interval check
            let highMemoryThreshold = seconds
            if (this.memoryHighCount > highMemoryThreshold && !this.isMemoryErrorReported) {
                this.isMemoryErrorReported = true
                ExceptionReporter.captureException(new Error("high memory"))
            }
        } else {
            this.memoryHighCount = 0
        }
    }

    beginMeasure(stat) {
        this.getStat(stat).startTime = process.hrtime()
    }

    endMeasure(stat) {
        let duration = process.hrtime(this.getStat(stat).startTime)
        let milliseconds = duration[0] * 1000 + duration[1] / 1000000
        this.getStat(stat).duration = Math.round(milliseconds * 10) / 10

        let isOneSecond = this.getStat(stat).count === 10
        if (isOneSecond) {
            this.getStat(stat).maxDuration = 0 // reset max every second
            this.getStat(stat).count = 0
        }

        this.getStat(stat).maxDuration = this.getStat(stat).maxDuration || 0
        this.getStat(stat).maxDuration = Math.max(this.getStat(stat).duration, this.getStat(stat).maxDuration)
        this.getStat(stat).count = this.getStat(stat).count || 0
        this.getStat(stat).count += 1
    }

    getStat(stat) {
        if (!this.stats[stat]) {
            this.stats[stat] = {}
        }

        return this.stats[stat]
    }

    ipToDomain(region, ip) {
        return this.ipToSubdomain(region, ip) + `.archerfall.io`
    }

    ipToSubdomain(region, ip) {
        let hexIp = ip
            .split(".")
            .map((num) => {
                let hex = parseInt(num).toString(16)
                return hex.length === 1 ? "0" + hex : hex
            })
            .join("")

        let namespace = this.getNamespace()

        return [namespace, region, hexIp].join("-")
    }

    getNamespace() {
        if (process.env.PRIME) return "prime"

        return "game"
    }

    getAvailableMaps() {
        return ["labyrinth", "cave", "ice", "hell"]
    }

    async loadMaps() {
        this.isLoadingMaps = true

        try {
            let levels = await LevelModel.findAll({
                where: {
                    isFeatured: {
                        [Op.eq]: true,
                    },
                    isPrivate: {
                        [Op.eq]: false,
                    },
                },
                include: [{ model: User, as: "creator" }],
                limit: 50,
            })

            levels.forEach((level) => {
                let levelData = level.getPublicData()
                let data = levelData.data
                data.thumbnail = levelData.thumbnail
                data.creator = level.creator.name
                const levelMap = new LevelMap(level.uid, data.name, data)
                this.maps[level.uid] = levelMap
            })
        } catch (e) {
            ExceptionReporter.captureException(e)
        }

        this.isLoadingMaps = false
    }

    getMapIds() {
        return Object.keys(this.maps)
    }

    updateMapCache(uid, data) {
        if (this.maps[uid]) {
            this.maps[uid].updateData(data)
        }
    }

    readMapFromFile(mapName, cb) {
        fs.readFile(path.resolve(__dirname, `./levels/${mapName}.json`), "utf8", (err, data) => {
            if (err) {
                console.error(err)
                cb()
                return
            }

            let json = JSON.parse(data)
            cb(json)
        })
    }

    getMapIds() {
        return Object.keys(this.maps)
    }

    hasNoMaps() {
        return Object.keys(this.maps).length === 0
    }

    createEmptyMap() {
        const data = {
            "rowCount": 20,
            "colCount": 34,
            "foregroundColor": "#555555",
            "backgroundColor": "#222222",
            "spawnPoints": [],
            "blocks": [],
        }

        const options = {
            data: data,
            "thumbnail":
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII=",
            "creator": "",
        }

        const levelMap = new LevelMap(1, "Initial", options)
        return levelMap
    }

    async getMapCopy(uid) {
        let levelMap = this.maps[uid]
        if (!levelMap) {
          let level = await LevelModel.findOne({
            where: { uid: uid },
            include: [{ model: User, as: "creator" }],
          })

          if (!level) {
            return
          }

          let levelData = level.getPublicData()
          let data = levelData.data
          data.thumbnail = levelData.thumbnail
          data.creator = level.creator.name
          levelMap = new LevelMap(uid, data.name, data)
        }

        return levelMap.createCopy()
    }

    getNextMap() {
        if (this.hasNoMaps()) {
            let levelMap = this.createEmptyMap()
            return levelMap
        }

        let id = this.getMapIds()[this.currentMapIndex]

        this.currentMapIndex += 1

        if (this.currentMapIndex >= this.getMapIds().length) {
            this.currentMapIndex = 0
        }

        return this.maps[id]
    }

    initRemoteEventHandler() {
        this.remoteEventHandler = new RemoteEventHandler(this)
    }

    onSocketMessage(eventName, data, socket) {
        this.remoteEventHandler.onSocketMessage(eventName, data, socket)
    }

    onClientDisconnect(socket) {
        this.remoteEventHandler.onClientDisconnect(socket)
    }

    initLivenessProbeServer() {
        if (debugMode) return

        this.livenessServer = net.createServer((socket) => {
            socket.end("pong\n")
        })

        let unixSocket
        if (debugMode) {
            unixSocket = process.env.HOME + "/liveness_probe"
        } else {
            unixSocket = "/var/run/liveness_probe_" + this.systemdIndex
        }

        if (fs.existsSync(unixSocket)) {
            fs.unlinkSync(unixSocket)
        }
        this.livenessServer.listen(unixSocket, () => {
            console.log("listening on " + unixSocket)
        })
    }

    addGame(game) {
        this.games[game.getId()] = game
        this.onGameCountChanged()
    }

    isServerFull() {
        return this.getPlayerCount() >= 500
    }

    getPlayerCount() {
        let total = 0

        this.forEachGame((game) => {
            total += game.getPlayerCount()
        })

        return total
    }

    forEachGame(cb) {
        for (let gameId in this.games) {
            cb(this.games[gameId])
        }
    }

    removeGame(game) {
        delete this.games[game.getId()]
        this.onGameCountChanged()
    }

    allocateGameId() {
        let notFound = true
        let result

        while (notFound) {
            let id = base64id.generateId().substring(0, 12)
            if (!this.games[id]) {
                notFound = false
                result = id
            }
        }

        return result
    }

    onGameCountChanged() {
        this.matchmakerClient.sendServerInfoToMatchmaker()
    }

    getGamesJson() {
        let result = {}

        for (let id in this.games) {
            let game = this.games[id]
            if (game.isCustomGame()) {
                result[id] = game.toMatchmakerJson()
            }
        }

        return result
    }

    generateName() {
        if (!this.nameGenerator) {
            this.nameGenerator = Faker
        }

        let name = this.nameGenerator.name.firstName()

        if (this.isUsernameTakenInServer(name)) {
            return this.generateName()
        } else {
            return name
        }
    }

    async joinLobby(socket, data) {
        let game = this.games[data.gameUid]
        if (!game) return
        if (!game.isCustomJoinable()) {
            if (game.isFull()) {
                SocketUtil.emit(socket, "CantJoin", { message: "Game is full" })
            }

            return
        }

        let player = await this.initPlayer(socket, data)
        if (!player) return

        game.addPlayer(player)
        game.emitLobbyJoin(player)
        game.emitOtherPlayerLobbyJoined({ except: player })

        if (game.isRoundStarted()) {
            game.addPlayerToStage(player)
        }
    }

    async createCustomGame(socket, data) {
        if (this.games[data.gameUid]) return

        let player = await this.initPlayer(socket, data)
        if (!player) return

        let map = this.getNextMap()
        let game = new Game(this, {
            map: map,
            host: player,
            isPrivate: false,
        })

        if (debugMode) {
            global.dg = game
        }

        game.addHost(player)
        game.emitLobbyJoin(player)
    }

    async join(socket, data) {
        if (this.isServerFull()) {
            SocketUtil.emit(socket, "CantJoin", { message: `Server is full` })
            return
        }

        if (data.gameUid) {
            let game = this.games[data.gameUid]
            if (!game) {
                SocketUtil.emit(socket, "CantJoin", { message: `Game ${data.gameUid} doesnt exist` })
                return
            } else {
                let player = await this.initPlayer(socket, data)
                if (!player) return

                game.addPlayerAndJoinStage(player)
                // TBD
            }
        } else {
            let player = await this.initPlayer(socket, data)
            if (!player) return

            this.addMatchQueue(player)
        }
    }

    async getUidFromRequest(idToken, uid) {
        if (debugMode) {
            return uid
        } else {
            return FirebaseAdminHelper.verifyIdToken(idToken)
        }
    }

    async initPlayer(socket, data) {
        if (data.username.length > 15) {
            SocketUtil.emit(socket, "CantJoin", { message: "username must be max 15 characters" })
            return
        }

        if (data.idToken) {
            let uid = await this.getUidFromRequest(data.idToken, data.uid)
            if (!uid) {
                SocketUtil.emit(socket, "CantJoin", { message: "Player credentials are invalid" })
                return
            }

            let userModel = await User.findOne({ where: { uid: uid } })
            if (!userModel) {
                SocketUtil.emit(socket, "CantJoin", { message: "Player not found" })
                return
            }
            data.username = userModel.name
            data.uid = uid
        } else {
            if (BadWordsFilter.isBadWord(data.username)) {
                SocketUtil.emit(socket, "CantJoin", { message: "username not appropriate " })
                return
            }

            if (this.playerNames[data.username]) {
                SocketUtil.emit(socket, "CantJoin", { message: "username already taken" })
                return
            }

            if (data.username.length === 0) {
                data.username = this.generateUniqueUsername()
            } else {
                let existingUser = await User.findOne({ where: { name: data.username } })
                if (existingUser) {
                    SocketUtil.emit(socket, "CantJoin", { message: "username already taken" })
                    return
                }
            }
        }

        return new Player(socket, data)
    }

    generateUniqueUsername() {
        if (!this.nameGenerator) {
            this.nameGenerator = Faker
        }

        let name = this.nameGenerator.name.firstName()

        let isUsernameTakenInServer = this.playerNames[name]
        let isBadWord = BadWordsFilter.isBadWord(name)
        if (isUsernameTakenInServer || isBadWord) {
            return this.generateUniqueUsername()
        } else {
            return name
        }
    }

    addMatchQueue(player) {
        this.matchQueue.push(player)
    }

    shouldPauseProcessingMatchQueue() {
        return this.isLoadingMaps
    }

    processMatchQueue(options = {}) {
        if (this.shouldPauseProcessingMatchQueue()) return

        let queue = this.matchQueue
        let joinableGames = this.joinableGames

        if (queue.length === 0) return

        let minPlayersRequired = 1
        let maxPlayersInGame = this.MAX_PLAYERS_PER_GAME

        while (Object.keys(joinableGames).length > 0 && queue.length > 0) {
            let player = queue.shift()
            let game = Object.values(joinableGames)[0]

            if (!player.isRemoved) {
                game.addPlayerAndJoinStage(player)
                game.autoStart()
            }
        }

        while (queue.length >= minPlayersRequired) {
            let map = this.getNextMap()
            let game = new Game(this, { map: map })

            if (debugMode) {
                global.dg = game
            }

            let numPlayers = Math.min(queue.length, maxPlayersInGame)
            let players = queue.splice(0, numPlayers)

            game.setup(() => {
                players.forEach((player) => {
                    if (!player.isRemoved) {
                        game.addPlayerAndJoinStage(player)
                        game.autoStart()
                    }
                })
            })
        }
    }

    addJoinableGame(game) {
        this.joinableGames[game.getId()] = game
    }

    removeJoinableGame(game) {
        delete this.joinableGames[game.getId()]
    }

    onPlayerCountChanged() {
        this.matchmakerClient.sendServerInfoToMatchmaker()
    }

    getHost() {
        let ip = this.SERVER_IP
        let port = this.APP_SERVER_PORT

        let environment = this.getEnvironment()

        if (["staging", "production"].indexOf(environment) !== -1) {
            let domain = this.ipToDomain(this.getRegion(), ip)
            return [domain, port].join(":")
        } else if (environment === "development") {
            return ["localhost", port].join(":")
        } else {
            return [ip, port].join(":")
        }
    }

    getHostName() {
        let host = this.getHost().replace(".archerfall.io", "")
        return host.split(":")[0]
    }

    getEnvironment() {
        return process.env["NODE_ENV"]
    }
}

global.server = new Server()
global.server.run()
