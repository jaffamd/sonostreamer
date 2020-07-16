const url = 'ws://pocuspi.local:8080'
const connection = new WebSocket(url)

const deviceIndicator = document.getElementById('capture-device-status')
const streamIndicator = document.getElementById('stream-status')

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
    console.log(status)
    deviceIndicator.style.backgroundColor = "#0cf249"
  } else {
    console.log(status)
    deviceIndicator.style.backgroundColor = "gray"
  }

  if (status.stream == true) {
    console.log(status)
    streamIndicator.style.backgroundColor = "#0cf249"
  } else {
    console.log(status)
    streamIndicator.style.backgroundColor = "gray"
  }
}
