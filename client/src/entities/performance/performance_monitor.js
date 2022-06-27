const Game = require("../game");

class PerformanceMonitor {

  constructor(game) {
    this.game = game
    this.inputDelay = 0
    this.upstream = 0
    this.maxUpstreamLastThreeSeconds = 0
    this.upstreamValues = []

    document.querySelector(".resume_graph_btn").addEventListener("click", this.onResumeClick.bind(this), true)
    document.querySelector(".close_graph_btn").addEventListener("click", this.onCloseClick.bind(this), true)
  }

  init() {
    if (this.isInitialized) return
    // load current chart package
    google.charts.load("current", {
      packages: ["corechart", "line"]
    });
    // set callback function when api loaded
    google.charts.setOnLoadCallback(this.setup.bind(this));
    this.isInitialized = true
  }

  setup() {
    // create data object with default value
    this.data = google.visualization.arrayToDataTable([
      ["Time", "InputDelay", "Upstream", "RenderDelay"],
      [0, 0, 0, 0]
    ]);

    // create options object with titles, colors, etc.
    this.upstreamOptions = {
      title: "Upstream",
      hAxis: {
        title: "Time"
      },
      vAxis: {
        title: "ms",
        maxValue: 300,
        minValue: 50
      }
    };

    // draw chart on load
    this.chart = new google.visualization.LineChart(
      document.querySelector(".performance_chart_div")
    );
    this.chart.draw(this.data, this.upstreamOptions);

    this.index = 0
  }

  setUpstream(upstream) {
    this.upstream = upstream
  }

  setInputDelay(inputDelay) {
    this.inputDelay = inputDelay
  }

  graphUpstreamInterval(value) {
  }

  markPlayerInputTime() {
    this.playerInputTime = Date.now()
  }

  recordPlayerInputTime() {
    if (this.playerInputTime) {
      let inputDelay = Date.now() - this.playerInputTime
      this.setInputDelay(inputDelay)

      this.playerInputTime = null
    }
  }

  recordUpstreamRate() {
    let time = Date.now()

    if (this.lastUpstreamTime) {
      let upstreamInterval = time - this.lastUpstreamTime
      this.setUpstream(upstreamInterval)
      this.determineMaxUpstreamLastThreeSeconds(upstreamInterval)
    }

    this.lastUpstreamTime = time
  }

  determineMaxUpstreamLastThreeSeconds(upstreamInterval) {
    let numSeconds = 3
    if (upstreamInterval > this.maxUpstreamLastThreeSeconds) {
      this.maxUpstreamLastThreeSeconds = upstreamInterval
      this.upstreamValues.push(upstreamInterval)
      return
    }

    let numValuesToStore = game.tickRate * numSeconds
    if (this.upstreamValues.length > numValuesToStore) {
      this.upstreamValues.shift()
    }

    this.upstreamValues.push(upstreamInterval)

    this.maxUpstreamLastThreeSeconds = Math.max(...this.upstreamValues)
  }

  draw() {
    if (!this.shouldStart) return
    if (!this.chart) return

    if (this.data.getNumberOfRows() > 120) {
      this.data.removeRow(0)
    }
    this.data.addRow([this.index, this.inputDelay, this.upstream, this.getRenderDelay()])
    this.chart.draw(this.data, this.upstreamOptions)

    this.index++
  }

  getRenderDelay() {
    var renderDelay = (1000.0 / this.game.tickRate)
    
    // 100ms (max renderDelay is 250ms)
    if (renderDelay <= 100) {
      if (this.maxUpstreamLastThreeSeconds > 150) {
        return 200
      } else if (this.maxUpstreamLastThreeSeconds > 200) {
        return 250
      }
    }

    return renderDelay
  }

  onResumeClick() {
    this.shouldStart = !this.shouldStart
    this.renderActionButton()
  }

  renderActionButton() {
    if (this.shouldStart) {
      document.querySelector(".resume_graph_btn").innerText = "Stop"
    } else {
      document.querySelector(".resume_graph_btn").innerText = "Start"
    }
  }

  onCloseClick() {
    this.hide()
  }

  show() {
    document.querySelector(".performance_graph").style.display = 'block'
    this.shouldStart = true
    this.renderActionButton()
    this.init()
  }

  hide() {
    this.shouldStart = false
    this.renderActionButton()
    document.querySelector(".performance_graph").style.display = 'none'
  }

  toggle() {
    let div = document.querySelector("#performance_stats")
    if (div.style.display === "block") {
      div.style.display = "none"
      this.hide()
    } else {
      div.style.display = "block"
      this.show()
    }
  }

}

module.exports = PerformanceMonitor