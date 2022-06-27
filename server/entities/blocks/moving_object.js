const MovingObject = () => {
}

MovingObject.prototype = {
  isMovingObject() {
    return true
  },

  isStatic() {
    return false
  }
}

module.exports = MovingObject