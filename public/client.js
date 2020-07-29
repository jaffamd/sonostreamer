const url = 'ws://pocuspi.local:8080'
const connection = new WebSocket(url)

const deviceIndicator = document.getElementById('capture-device-status')
const streamIndicator = document.getElementById('stream-status')

const updatebtn = document.getElementById('update-btn')

checkForUpdates()

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
  let response = confirm('This will update to the latest software version. The process will take several minutes, requires a stable internet connection, and will cause the Sonostreamer to automatically reboot. Do you wish to proceed?')
  if (x == true) {
    fetch('./system/update')
  } else {
    alert('The system will not be updated at this time')
  }
}

connection.onopen = () => {
  console.log('Connection opened')
}

connection.onerror = error => {
  const err = error.toString()
  console.log(`WebSocket error: ${err}`)
}

connection.onmessage = message => {
  let status = JSON.parse(message.data)
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
