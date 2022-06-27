const Cookies = require("js-cookie")

class SoundManager {

  constructor(game) {
    this.game = game
    this.initSoundManager(game)
  }

  getBackgroundSoundNames() {
    return ["game_background"]
  }

  getEffectsSoundNames() {
    return ["arrow", "arrow_hit", "explosion", "player_land", "jump", "laser_bounce", "appear", "reload", "ice", "bolt", "burning", "chemical_explosion", "gas_release", "drill", "monster_hit", "mob_portal"]
  }

  initSoundManager(game) {
    this.game = game
    this.sounds = {}
    this.currentSounds = {}
    this.loadedSounds = {}

    let soundNames = this.getSoundNames()

    soundNames.forEach((soundName) => {
      this.sounds[soundName] = this.createSound(soundName)
    })

    let volume = Cookies.get("volume")
    if (volume === 'off') {
      this.setEffectsVolume(0)
      this.setBackgroundVolume(0)
      document.querySelectorAll(".mute_btn").forEach((el) => {
        el.classList.add("off")
      })
    } else {
      this.setEffectsVolume(this.getSavedOrDefaultEffectsVolume())
      this.setBackgroundVolume(this.getSavedOrDefaultBackgroundVolume())
      document.querySelectorAll(".mute_btn").forEach((el) => {
        el.classList.add("on")
      })
    }
  }

  isMuted() {
    let volume = Cookies.get("volume")
    return volume === 'off'
  }

  getSoundNames() {
    return this.getBackgroundSoundNames().concat(this.getEffectsSoundNames())
  }

  getSavedOrDefaultEffectsVolume() {
    return 1
  }

  getSavedOrDefaultBackgroundVolume() {
    return 0.5
  }

  setEffectsVolume(volume) {
    let soundNames = this.getEffectsSoundNames()

    soundNames.forEach((soundName) => {
      this.setVolume(soundName, volume)
    })
  }

  setBackgroundVolume(volume) {
    let soundNames = this.getBackgroundSoundNames()

    soundNames.forEach((soundName) => {
      this.setVolume(soundName, volume)
    })
  }

  setVolume(soundName, volume) {
    if (!this.sounds) return

    if (this.sounds[soundName]) {
      this.sounds[soundName].volume(volume)
    }
  }

  createSound(name) {
    let volume = this.isMuted() ? 0 : 0.5

    return new Howl({
      src: ['/assets/sounds/' + name + '.mp3'],
      volume: volume,
      onload: this.onSoundLoad.bind(this, name),
      onend: this.onSoundEnd.bind(this, name)
    })
  }

  onSoundLoad(name) {
    this.loadedSounds[name] = true
  }

  onSoundEnd(name) {
    this.removeCurrentSound(name)
  }

  addCurrentSound(name, shouldDelete = true) {
    this.currentSounds[name] = {
      lastPlayedTime: Date.now(),
      shouldDelete: shouldDelete
    }
  }

  removeCurrentSound(name) {
    if (this.currentSounds[name] && this.currentSounds[name].shouldDelete) {
      delete this.currentSounds[name]
    }
  }

  playHomeBackgroundMusic() {
    let musicName =  this.getHomeBackground()
    if (this.sounds[musicName] && this.sounds[musicName].playing()) return

    if (this.sounds[this.getGameBackground()]) {
      this.stopSound(this.getGameBackground())
    }

    this.backgroundMusicSoundId = this.playSoundLazyDownload(musicName, { loop: true })
  }

  playGameBackgroundMusic() {
    let musicName =  this.getGameBackground()
    if (this.sounds[musicName] && this.sounds[musicName].playing()) return

    if (this.sounds[this.getHomeBackground()]) {
      this.stopSound(this.getHomeBackground())
    }

    this.backgroundMusicSoundId = this.playSoundLazyDownload(musicName, { loop: true })
  }

  getHomeBackground() {
    return "home_background"
  }

  getGameBackground() {
    return "game_background"
  }

  cleanSounds() {
    for (let soundName in this.currentSounds) {
      this.stopSound(soundName)
    }

    this.currentSounds = {}
  }

  stopAllBackgroundMusic() {
    this.stopSound(this.getHomeBackground())
    this.stopSound(this.getGameBackground())
  }

  playSoundLazyDownload(name, options = {}) {
    if (!this.loadedSounds[name]) {
      this.loadSound(name, () => {
        this.playSound(name, options)
      })
    } else {
      this.playSound(name, options)
    }
  }

  isSoundRecentlyPlayed(name, interval) {
    let result = false

    let soundData = this.currentSounds[name]
    if (soundData) {
      let elapsed = Date.now() - soundData.lastPlayedTime
      if (elapsed < interval) {
        result = true
      }
    }

    return result
  }


  playSound(name, options = {}) {
    if (!this.loadedSounds[name]) return

    let sound = this.sounds[name]

    if (options.minInterval) {
      if (this.isSoundRecentlyPlayed(name, options.minInterval)) {
        return
      }
    }

    if (this.isSoundAlreadyPlaying(name)) {
      if (options.skipIfPlaying) {
        return
      } else {
        sound.stop()
      }
    }

    if (options.loop) {
      sound.loop(true)
    }

    let soundId

    try {
      soundId = sound.play()
      this.addCurrentSound(name, options.shouldDelete)
    } catch(e) {
      console.error(e)
    }

    return soundId
  }

  stopSound(name) {
    let sound = this.sounds[name]
    if (sound) {
      try {
        sound.stop()
      } catch(e) {
        console.error(e)
      }
    }
  }

  isSoundAlreadyPlaying(name) {
    return this.sounds[name] && this.sounds[name].playing()
  }


  loadSound(name, cb) {
    let volume = this.isMuted() ? 0 : 0.5
    let sound = new Howl({
      src: ['/assets/sounds/' + name + '.mp3'],
      volume: volume,
      onload: () => {
        this.loadedSounds[name] = true
        cb()
      },
      onend: () => {
        this.removeCurrentSound(name)
      }
    })
    
    this.sounds[name] = sound
  }

}

module.exports = SoundManager