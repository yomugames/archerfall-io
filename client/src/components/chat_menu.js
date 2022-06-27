const SocketUtil = require("./../util/socket_util")

class ChatMenu {
  constructor(game, el) {
    this.game = game
    this.el = el

    this.init()
    this.initListeners()
  }

  cleanup() {
    this.chatHistory.innerHTML = ""
    this.chatInput.removeEventListener("keyup", this.keyInputHandler, true)
    this.chatInput.removeEventListener("focusout", this.inputFocusOutHandler, true)
    this.chatInput.removeEventListener("focus", this.inputFocusInHandler, true)
  }

  clear() {
    this.chatHistory.innerHTML = ""
  }

  init() {
    this.chatInput = this.el.querySelector(".chat_input")
    this.chatInputContainer = this.el.querySelector(".chat_input_container")
    this.chatHistory = this.el.querySelector(".chat_history")

    this.commandHistory = []
    this.MAX_COMMAND_HISTORY = 100
    this.MAX_HISTORY_CHAT_MESSAGES = 200

    this.scrollIndex = 0
  }

  initListeners() {
    this.keyInputHandler = this.onInputKeyup.bind(this)
    this.inputFocusOutHandler = this.onInputFocusOut.bind(this)
    this.inputFocusInHandler = this.onInputFocusIn.bind(this)

    this.chatInput.addEventListener("keyup", this.keyInputHandler, true)
    this.chatInput.addEventListener("focusout", this.inputFocusOutHandler, true)
    this.chatInput.addEventListener("focus", this.inputFocusInHandler, true)
  }

  onChatTooltipClick(e) {
  }

  onChatContentRightClick(e) {
  }

  onChatContentClick(e) {
  }

  showChatHistory() {
    let selected = document.querySelector(".chat_history.selected")
    if (selected) {
      selected.classList.remove("selected")
    }
    document.querySelector(".chat_history").classList.add("selected")
  }

  onInputKeyup(event) {
    if (event.keyCode === 27) { // escape
      this.chatInput.blur()
      this.close()
    } else if (event.key === "Enter") {
      this.submit()
    } else if (event.key === "ArrowUp") {
      this.scrollHistory(1)
    } else if (event.key === "ArrowDown") {
      this.scrollHistory(-1)
    }
  }

  onInputFocusIn(e) {
    this.open()
  }

  onInputFocusOut(e) {
    if (this.game.isMobile()) {
      // virtual keyboard "Done" key is tapped
      if (e.target.id === 'chat_input') return

      this.submit()
      this.close()
    } else {
      this.close()
    }
  }

  submit() {
    let text = this.chatInput.value

    SocketUtil.emit("ClientChat", { message: text })

    if (text.length > 0) {
      this.commandHistory.unshift(text)
    }

    if (this.commandHistory.length > this.MAX_COMMAND_HISTORY) {
      this.commandHistory.pop()
    }

    this.chatInput.value = ""
    this.scrollIndex = -1 // start at -1
  }

  clearUnreadCount() {
    let chatTab = document.querySelector(".chat_tab")
    chatTab.querySelector(".chat_unread_count").innerText = ""
  }

  repositionTooltip(el, boundingRect) {
    let tooltip = document.querySelector(".chat_player_tooltip")

    const bottomMargin = 5
    let left = boundingRect.x + el.offsetWidth / 2 
    let top  = boundingRect.y + bottomMargin
    const margin = 5

    left = Math.max(margin, left) // cant be lower than margin
    left = Math.min(window.innerWidth - tooltip.offsetWidth - margin, left) // cant be more than than margin

    if (top < margin) {
      // show at bottom instead
      top = boundingRect.y + (bottomMargin * 2)
    }
    top = Math.max(margin, top) // cant be lower than margin
    top = Math.min(window.innerHeight - tooltip.offsetHeight - margin, top) // cant be more than than margin

    tooltip.style.left = left + "px"
    tooltip.style.top  = top  + "px"
  }


  createChatEntry(messageObj) {
    let chatMessage = document.createElement("div")
    chatMessage.className = "chat_message"
    chatMessage.dataset.username = messageObj.username

    // username
    let chatUsername = document.createElement("span")
    chatUsername.className = "chat_user"
    if (messageObj.username) {
      chatUsername.innerText = "" + messageObj.username + ":"
      if (messageObj.uid) {
        chatUsername.dataset.uid = messageObj.uid
      }
      chatUsername.dataset.username = messageObj.username
    }

    // message
    let chatContent = document.createElement("span")
    chatContent.className = "chat_content"
    chatContent.innerText = messageObj.message
    if (messageObj.status === "error") {
      chatContent.dataset.error = true
    }  else if (messageObj.status === "success") {
      chatContent.dataset.success = true
    }

    chatMessage.appendChild(chatUsername)
    chatMessage.appendChild(chatContent)

    this.chatHistory.appendChild(chatMessage)
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight
  }

  isMuted(name) {
    return false // this.game.mutedPlayers[name]
  }

  onServerChat(data) {
    const playerId = data.playerId
    const username = data.username
    const message  = data.message

    let messageObj = this.parseServerChat(message)
    messageObj.username = username
    messageObj.uid = data.uid

    if (!this.isMuted(username)) {
      this.createChatEntry(messageObj)
    }

    let chatMessages = Array.from(this.el.querySelectorAll(`.chat_history .chat_message`))
    if (chatMessages.length > this.MAX_HISTORY_CHAT_MESSAGES) {
      let oldMessage = chatMessages[0]
      if (oldMessage.parentElement) {
        oldMessage.parentElement.removeChild(oldMessage)
      }
    }
  }

  parseServerChat(message) {
    let errorRegex = new RegExp(/^%error%/)
    let successRegex = new RegExp(/^%success%/)

    if (message.match(errorRegex)) {
      return { status: "error", message: message.replace(errorRegex, "") }
    } else if (message.match(successRegex)) {
      return { status: "success", message: message.replace(successRegex, "") }
    } else {
      return { status: "normal", message: message }
    }
  }

  close() {
    this.el.classList.add("readonly")
  }

  hide() {
    this.el.style.display = 'none'
  }

  open(options = {}) {
    if (this.chatHideTween) {
      this.chatHideTween.stop()
    }

    this.el.classList.remove("readonly")

    if (document.activeElement !== this.chatInput) {
      this.chatInput.focus()
    }
  }

  isOpen() {
    return this.el.classList.contains("chat_mode")
  }

  isOpenAndFocused() {
    return this.isOpen() && document.activeElement === this.chatInput
  }

  isClose() {
    return !this.isOpen()
  }

  scrollHistory(direction) {
    if (this.commandHistory.length === 0) return

    this.scrollIndex += direction

    if (this.scrollIndex < 0) {
      this.scrollIndex = 0
    } else if (this.scrollIndex >= this.commandHistory.length) {
      this.scrollIndex = this.commandHistory.length - 1
    }

    this.chatInput.value = this.commandHistory[this.scrollIndex]
  }

  getChatHideTween() {
    let opacity = { opacity: 1 }
    this.chatHideTween = new TWEEN.Tween(opacity)
        .to({ opacity: 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.chatMenu.style.opacity = opacity.opacity
        })
        .delay(3000)

    return this.chatHideTween
  }

}

module.exports = ChatMenu