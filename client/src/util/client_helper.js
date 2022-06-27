module.exports = {
  httpRequest(url, cb) {
    var xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        cb.success(xhttp.responseText)
      }
    }
    xhttp.onerror = () => {
      cb.error()
    }
    xhttp.open("GET", url, true)
    xhttp.send()

    return xhttp
  },
  httpPost(url, body, cb) {
    var xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        cb.success(xhttp.responseText)
      }
    }

    xhttp.onerror = () => {
      cb.error()
    }

    xhttp.open("POST", url)
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
    xhttp.send(JSON.stringify(body))

    return xhttp
  },
  hexToInt(hex) {
    return parseInt(hex.replace("#", ""), 16)
  },
  hex(x) {
    x = x.toString(16)
    return x.length == 1 ? "0" + x : x
  },
  getFadeTween(element, before, after, delay, duration = 1000) {
    if (element.style.display === "none" && before === 0) {
      element.style.display = "block"
      element.style.opacity = "0"
    }

    let opacity = { opacity: before }
    let tween = new TWEEN.Tween(opacity)
      .to({ opacity: after }, duration)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        element.style.opacity = opacity.opacity
      })
      .onComplete(() => {
        if (after === 0) {
          element.style.display = "none"
        }
      })
      .delay(delay)

    return tween
  },
  replaceQueryParam(param, newval, search) {
    var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?")
    var query = search.replace(regex, "$1").replace(/&$/, "")

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : "")
  },
  addSmoke(x, y, color = 0x999999, minWidth = 20, maxWidth = 50, shouldRandomizeDistance) {
    let data = this.getSmokeTween(x, y, color, minWidth, maxWidth, shouldRandomizeDistance)

    data.tween.start()

    return data
  },
  lerp(a, b, p) {
    if (p < 0) return a
    if (p > 1) return b
    return p * (b - a) + a
  },
  getSmokeTween(x, y, color = 0x999999, minWidth = 20, maxWidth = 50, shouldRandomizeDistance = true) {
    const sprite = new PIXI.Sprite(PIXI.utils.TextureCache["white_smoke.png"])
    sprite.anchor.set(0.5)

    const randomDistanceX = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0
    const randomDistanceY = shouldRandomizeDistance ? Math.floor(Math.random() * 64) - 32 : 0

    const randomWidth = Math.floor(Math.random() * (maxWidth - minWidth)) + minWidth
    sprite.width = randomWidth
    sprite.height = randomWidth
    sprite.tint = color
    sprite.position.x = x - randomDistanceX
    sprite.position.y = y - randomDistanceY

    game.app.stage.addChild(sprite)

    let alpha = { alpha: 0.8 }

    var tween = new TWEEN.Tween(alpha)
      .to({ alpha: 0 }, 3000)
      .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        sprite.alpha = alpha.alpha
      })
      .onComplete(() => {
        game.app.stage.removeChild(sprite)
      })

    return {
      sprite: sprite,
      tween: tween,
    }
  },
  // https://stackoverflow.com/a/16360660
  getRandomColorInRange(startColor, endColor, ratio, options = {}) {
    startColor = startColor.replace("#", "")
    endColor = endColor.replace("#", "")

    let r = Math.ceil(
      parseInt(startColor.substring(0, 2), 16) * ratio + parseInt(endColor.substring(0, 2), 16) * (1 - ratio)
    )
    let g = Math.ceil(
      parseInt(startColor.substring(2, 4), 16) * ratio + parseInt(endColor.substring(2, 4), 16) * (1 - ratio)
    )
    let b = Math.ceil(
      parseInt(startColor.substring(4, 6), 16) * ratio + parseInt(endColor.substring(4, 6), 16) * (1 - ratio)
    )

    const randomColor = this.hex(r) + this.hex(g) + this.hex(b)
    return options.shouldReturnInteger ? parseInt(randomColor, 16) : randomColor
  },

  fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea")
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = "0"
    textArea.style.left = "0"
    textArea.style.position = "fixed"

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      var successful = document.execCommand("copy")
      var msg = successful ? "successful" : "unsuccessful"
      console.log("Fallback: Copying text command was " + msg)
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err)
    }

    document.body.removeChild(textArea)
  },

  copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text)
      return
    }
    navigator.clipboard.writeText(text).then(
      function () {
        console.log("Async: Copying to clipboard was successful!")
      },
      function (err) {
        console.error("Async: Could not copy text: ", err)
      }
    )
  },
}
