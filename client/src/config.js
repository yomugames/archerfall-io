module.exports = {
  SENTRY_RELEASE_NAME: "archer-io",
  SENTRY_DSN: "https://0b3d29ef08b846458e130bebf6cf337a@o1097873.ingest.sentry.io/6119756",
  "development": {
    matchmakerUrl: "http://localhost:3000/",
    firebase: {
      apiKey: "AIzaSyDmb4S0Q23V6tTCDSFHFyVwi0v_udNSpqI",
      authDomain: "archerfall-development.firebaseapp.com",
      projectId: "archerfall-development",
      storageBucket: "archerfall-development.appspot.com",
      messagingSenderId: "816497403049",
      appId: "1:816497403049:web:cdaf58ed41ffebdacdf5b8"
    }
  },
  "production": {
    matchmakerUrl: "https://matchmaker.archerfall.io/",
    firebase: {
      apiKey: "AIzaSyCNly_9Zy8DTOqqI4xrR_E_YRJHf4Yz76A",
      authDomain: "archerfall-production.firebaseapp.com",
      projectId: "archerfall-production",
      storageBucket: "archerfall-production.appspot.com",
      messagingSenderId: "493596131101",
      appId: "1:493596131101:web:e42c14959779d0c886ebf4"
    }

  }
}