const Constants = require("./constants.json")

var customMod = function(a, n) {
  // https://stackoverflow.com/a/7869457
  return a - Math.floor(a/n) * n
}

module.exports = {
  assetPath: (assetName) => {
    return "assets/" + assetName
  },
  angleDeltaSigned: (targetAngleInRad, sourceAngleInRad) => {
    const diff = (targetAngleInRad - sourceAngleInRad) * 180 / Math.PI
    const angleInDeg = (diff + 180) % 360 - 180
    return angleInDeg * Math.PI / 180
    shortest_angle=((((end - start) % 360) + 540) % 360) - 180;
    return start + (shortest_angle * amount) % 360;
  },
  getSocketRemoteAddress(socket) {
    let uint8Array = new Uint8Array(socket.getRemoteAddress())
    return [uint8Array[12], uint8Array[13], uint8Array[14], uint8Array[15]].join(".")
  },
  absAngleDiff: (angleA, angleB) => {
    //https://stackoverflow.com/a/7869457
    let diff = (angleA - angleB) + 180
    return Math.abs(customMod(diff,360) - 180)
  },
  degToRad: (deg) => {
    return deg * Math.PI / 180
  },
  radToDeg: (rad) => {
    return rad * 180 / Math.PI 
  },
  swap: (json) => {
    var ret = {}
    for(var key in json){
      ret[json[key]] = key
    }
    return ret
  },
  ipToInt: (dot) => {
    var d = dot.split('.')
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3])
  },
  intToIp: (num) => {
    var d = num%256
    for (var i = 3; i > 0; i--)
    {
        num = Math.floor(num/256)
        d = num%256 + '.' + d
    }
    return d
  },
  stringifyTimeShort: (time) => {
    time = Math.round(time * 1000) / 1000

    var hours = parseInt( time / 3600 ) % 24
    var minutes = parseInt( time / 60 ) % 60
    var seconds = Math.floor(time % 60)
    var milliseconds = Math.floor(time * 1000) % 1000

    var result = ""
    var zeroPrependCheck = false

    if (hours !== 0) {
      result = result + hours
      zeroPrependCheck = true
      result += ":"
    }

    if (zeroPrependCheck) {
      result = result + (minutes < 10 ? "0" + minutes : minutes)
    } else {
      result = result + minutes
    }
    result += ":"

    zeroPrependCheck = true

    // if (seconds !== 0) {
    if (zeroPrependCheck) {
      result = result + (seconds < 10 ? "0" + seconds : seconds)
    } else {
      result = result + seconds
    }
    // }

    return result
  },

  capitalize(str) {
    return str.replace(/^\w/g, function(c) { return c.toUpperCase() })
  },

  // https://stackoverflow.com/a/1349426
  makeid(length) {
    var result           = []
    var characters       = 'abcdefghijklmnopqrstuvwxyz'
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * charactersLength)))
    }
    
    return result.join('')
  },

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  },

  shuffleArray(array) {
    // https://stackoverflow.com/a/12646864
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }

    return array
  },

  convertGridToPosition(grid) {
    return grid * Constants.tileSize + Constants.tileSize / 2
  }

}