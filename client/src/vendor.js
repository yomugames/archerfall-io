window.PIXI  = require('pixi.js')
window.Sentry = require("@sentry/browser")
window.Protobuf = require("protobufjs")
window.Howl = require("howler").Howl
window.TWEEN = require("./lib/tween.min.js")
require("./lib/filter-outline.js")
require("./lib/filter-kawase-blur.js")
require("./lib/filter-advanced-bloom.js")
window.dragonBones = require("./lib/dragonBones.js")

window.firebase = require("firebase/app")
require("firebase/auth")
