class LevelMap {
  constructor(id, name, data) {
    this.id = id
    this.name = name
    this.data = data
    this.creator = data.creator
  }

  setId(id) {
    this.id = id
  }

  getUid() {
    return this.id
  }

  updateData(data) {
    this.data = data
  }

  getCreator() {
    return this.creator
  }

  getName() {
    return this.name
  }

  toMatchmakerJson() {
    return {
      id: this.id,
      name: this.name,
      thumbnail: this.data.thumbnail
    }
  }

  createCopy() {
    let dataDeepCopy = JSON.parse(JSON.stringify(this.data))
    return new LevelMap(this.id, this.name, dataDeepCopy)
  }

}

module.exports = LevelMap