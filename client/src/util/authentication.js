const FirebaseClientHelper = require('./firebase_client_helper')
const Config = require("../config")
const ClientHelper = require("./client_helper")

class Authentication {

  constructor(main) {
    this.main = main

    let hasLocalStorage = this.checkLocalStorageSupport()
    // when iframed in incognito, localStorage is not available if (cookies are blocked)
    // firebase would throw error, and cant even play game. 
    // dont init firebase, show warning that cookies must be enable to login (for google sign in to work using their sdk)
    if (hasLocalStorage) {
      FirebaseClientHelper.initFirebase(this.onFirebaseAuth.bind(this))
      FirebaseClientHelper.onIdTokenChanged(this.onIdTokenChanged.bind(this))
    }

    this.initListeners()
  }

  initListeners() {
    document.getElementById("login_btn").addEventListener("click", this.onLoginBtnClick.bind(this), true)
    document.querySelector(".google_login_btn").addEventListener("click", this.onGoogleLoginBtnClick.bind(this), true)
    document.getElementById("set_username_btn").addEventListener("click", this.onSetUsernameBtnClick.bind(this), true)
    document.getElementById("new_username_input").addEventListener("keyup", this.onUsernameInputKeyup.bind(this), true)
    document.getElementById("logout_btn").addEventListener("click", this.onLogoutBtnClick.bind(this), true)

  }

  onGoogleLoginBtnClick(e) {
    FirebaseClientHelper.signIn("google")
  }

  onUsernameInputKeyup(e) {
    if (e.which === 13) {
      this.onSetUsernameBtnClick()
    }
  }

  async onSetUsernameBtnClick() {
    let username = document.getElementById("new_username_input").value
    if (username.length === 0) {
      document.getElementById("username_errors").innerText = "Username cant be blank"
      return
    } else if (username.length > 16) {
      document.getElementById("username_errors").innerText = "Username cant be longer than 16 characters"
      return
    }

    if (this.isUsernameSetInProgress) return
    this.isUsernameSetInProgress = true
    let uid = this.uid

    if (!uid) {
      this.isUsernameSetInProgress = false
      document.getElementById("username_errors").innerText = "Must log in to create username"
      return
    }

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = { idToken: idToken, uid: uid, username: username, email: this.user.email }
    ClientHelper.httpPost(matchmakerUrl + "create_user", data, {
      success: (result) => {
        this.isUsernameSetInProgress = false
        try {
          let data = JSON.parse(result)
          if (data.error) {
            document.getElementById("username_errors").innerText = data.error
          } else {
            // success
            this.renderLoggedInUser(username)
            this.hideUsernameInputForm()
          }
        } catch(e) {
          console.error(e)
          document.getElementById("username_errors").innerText = "Unable to create user"
        }
      },
      error: () => {
        this.isUsernameSetInProgress = false
        document.getElementById("username_errors").innerText = "Unable to create user"
      }
    })
  }

  onLoginBtnClick(e) {
    const socialLoginContainer = document.querySelector("#social_login_container")
    if (socialLoginContainer.style.display === 'block') {
      socialLoginContainer.style.display = 'none'
    } else {
      socialLoginContainer.style.display = 'block'
    }

  }

  onLogoutBtnClick() {
    this.user = null
    this.uid = null
    this.idToken = null
    
    FirebaseClientHelper.signOut(() => {
      this.onUserLogout()
    })

    document.getElementById("logged_in_menu_container").style.display = 'none'
    document.getElementById("firebaseui-auth-container").style.display = 'none'
  }

  onUserLogout() {
    this.showAuthContainer()
    this.hideUsernameContainer()
    this.hideUsernameInputForm()
    this.main.onUserLogout()
  }

  hideUsernameContainer() {
    document.getElementById("username_container").style.display = 'none'
  }

  onIdTokenChanged(user) {
    if (!user) return
    user.getIdTokenResult(false).then((result) => {
      this.idToken = result.token
    })
  }

  async onFirebaseAuth(user) {
    if (user) {
      this.user = user
      this.uid = user.uid

      this.showAuthProgress()

      let result = await this.getUserRecord(this.uid)
      this.userData = result

      this.hideAuthProgress()

      if (result.error) {
        if (result.error === 'User not found') {
          document.getElementById("logged_in_menu_container").style.display = 'block'
          this.showUsernameInputForm(user)
        } else {
          alert("Login error : " + result.error)
        }
      } else {
        this.renderLoggedInUser(this.userData.name)
      }

      this.userAuthenticatedListener()
    } else {
      // No user is signed in.
      this.onUserLogout()
    }
  }

  renderLoggedInUser(username) {
    this.username = username
    this.hideAuthContainer()
    document.getElementById("new_username_input").style.display = 'none'
    document.getElementById("logged_in_menu_container").style.display = 'block'
    document.getElementById("username_container").style.display = 'block'
    document.getElementById("username").innerText = username

    document.querySelector("#social_login_container").style.display = 'none'
  }

  showUsernameInputForm() {
    this.hideAuthContainer()
    document.getElementById("username_form_container").style.display = "block"
    document.querySelector(".enter_game_container").style.display = 'none'
  }

  hideUsernameInputForm() {
    document.getElementById("username_form_container").style.display = "none"
    document.querySelector(".enter_game_container").style.display = 'block'
  }


  showAuthProgress() {
    document.querySelector("#auth_in_progress").style.display = 'block'
  }

  hideAuthProgress() {
    document.querySelector("#auth_in_progress").style.display = 'none'
  }

  hideAuthContainer() {
    document.getElementById("authentication_container").style.display = 'none'
  }

  showAuthContainer() {
    document.getElementById("authentication_container").style.display = 'block'
  }

  getUserRecord(uid) {
    let matchmakerUrl = Config[env].matchmakerUrl
    return new Promise((resolve, reject) => {
      ClientHelper.httpRequest(matchmakerUrl + "get_user?uid=" + uid, {
        success: (result) => {
          try {
            let user = JSON.parse(result)
            if (user.error) {
              resolve({ error: user.error })
            } else {
              resolve(user)
            }
          } catch(e) {
            resolve({ error: "Something went wrong" })
          }
        },
        error: () => {
          resolve({ error: "Something went wrong" })
        }
      })
    })
  }

  onUserAuthenticated(userAuthenticatedListener) {
    this.userAuthenticatedListener = userAuthenticatedListener
  }

  initErrorReporting() {
    ExceptionReporter.init()
  }

  checkLocalStorageSupport() {
    let result = true

    try {
      window.localStorage
    } catch(e) {
      result = false
    }

    return result
  }

  isLoggedIn() {
    let hasLocalStorage = this.checkLocalStorageSupport()
    if (!hasLocalStorage) {
      return false
    }

    return FirebaseClientHelper.isLoggedIn()
  }

  getFirebaseIdToken() {
    return new Promise((resolve, reject) => {
      if (this.idToken) {
        resolve(this.idToken)
      } else {
        FirebaseClientHelper.fetchFirebaseIdToken(this.user,(token) => {
          this.idToken = token
          resolve(token)
        })
      }
    })
  }

}

module.exports = Authentication
