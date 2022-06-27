const BetterDedupe = require("./better_dedupe")
const Config = require("../config")

const dedupeIntegration = new BetterDedupe()


const ExceptionReporter = {
  init: () => {
    // https://github.com/quasarframework/quasar/issues/2233
    
    Sentry.init({ 
      dsn: Config.SENTRY_DSN, 
      release: Config.SENTRY_RELEASE_NAME + "@" + window.revision,
      maxBreadcrumbs: 100,
      integrations: [dedupeIntegration],
      ignoreErrors: ['ResizeObserver loop limit exceeded', 'interrupted connection or unreachable host', 'Network Error', 'Extension context invalidated']
    })

    this.initialized = true
  },
  getDedupeInstance() {
    return dedupeIntegration
  },
  getSentryInstance() {
    return Sentry
  },
  captureException: (e) => {
    console.error(e)

    if (typeof debugMode !== "undefined" && debugMode) {
      return
    }

    if (!this.initialized) ExceptionReporter.init()
    Sentry.captureException(e)
  }
}

module.exports = ExceptionReporter