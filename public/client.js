fetch('../system/settings')
  .then(response => response.json())
  .then(data => {
    let serveraddress = data['server-address']
    let streamkey = data['stream-key']
    let vidsrc = data['stream-key']
    document.getElementById('stream-url').innerText = `Stream URL: rtmp://${serveraddress}/live/${streamkey}`
    document.getElementById('video-source').innerText = `Video source: ${vidsrc}`
  })

function checkForUpdates() {
  updatebtn.classList = []
  updatebtn.classList.add('update-checking')
  fetch('./system/checkupdate')
    .then(response => response.json())
    .then(data => {
      if (data.msg == 'uptodate') {
        updatebtn.classList = []
        updatebtn.classList.add('up-to-date')
        updatebtn.disabled = true
      } else if (data.msg == 'updateneeded') {
        updatebtn.classList = []
        updatebtn.classList.add('update-available')
        updatebtn.disabled = false
      }
    })
    .catch(err => {
      console.log(err)
      alert('There was an error while checking for software updates')
    })
}

function requestUpdate() {
  let response = confirm('This will update to the latest software version. The process will take several minutes, requires a stable internet connection, and will cause the Sonostreamer to automatically reboot. Do you wish to proceed?\n\nNOTE: Your settings will be reset, including your streaming target/server, so please make note of this before updating.')
  if (response == true) {
    fetch('./system/update')
  } else {
    alert('The system will not be updated at this time')
  }
}

// Websocket implementation for real-time status updates (internect connectivity, presence of capture device, streaming status)
const url = 'ws://pocuspi.local:8080'
const connection = new WebSocket(url)

const internetIndicator = document.getElementById('internet-status')
const deviceIndicator = document.getElementById('capture-device-status')
const streamIndicator = document.getElementById('stream-status')

const updatebtn = document.getElementById('update-btn')
connection.onopen = () => {
  console.log('Connection opened')
}

connection.onerror = error => {
  const err = error.toString()
  console.log(`WebSocket error: ${err}`)
}

connection.onmessage = message => {
  let status = JSON.parse(message.data)

  if (status.internet == true) {
    //console.log(status)
    internetIndicator.style.backgroundColor = "#0cf249"
  } else {
    //console.log(status)
    internetIndicator.style.backgroundColor = "gray"
  }

  if (status.captureDevice == true) {
    //console.log(status)
    deviceIndicator.style.backgroundColor = "#0cf249"
  } else {
    //console.log(status)
    deviceIndicator.style.backgroundColor = "gray"
  }

  if (status.stream == true) {
    //console.log(status)
    streamIndicator.style.backgroundColor = "#0cf249"
  } else {
    //console.log(status)
    streamIndicator.style.backgroundColor = "gray"
  }
}

// Check for software updates
checkForUpdates()