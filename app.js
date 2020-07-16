const express = require('express')
const fs = require('fs')
const { exec } = require('child_process')
const execa = require('execa')
const websocket = require('ws')
const find = require('find-process')
var systemSettings

var status = {
  captureDevice: false,
  stream: false
}

function apply(settings) {
  // Save AP SSID and passphrase
  console.log('Saving AP settings...')
  const apSettings = 'interface=wlan0\n' +
    'driver=nl80211\n' +
    'ssid=' + settings['ap-ssid'] + '\n' +
    'hw_mode=g\n' +
    'hw_mode=g\n' +
    'channel=8\n' +
    'wmm_enabled=0\n' +
    'macaddr_acl=0\n' +
    'auth_algs=1\n' +
    'ignore_broadcast_ssid=0\n' +
    'wpa=2\n' +
    'wpa_passphrase=' + settings['ap-passphrase'] + '\n' +
    'wpa_key_mgmt=WPA-PSK\n' +
    'wpa_pairwise=CCMP TKIP\n' +
    'rsn_pairwise=CCMP\n' +
    'country_code=US\n' +
    'ieee80211n=1\n' +
    'ieee80211d=1'
  fs.writeFile('/etc/hostapd/hostapd.conf', apSettings, (err) => {
    if (err) {
      console.log(err)
      return
    }
  })

  // Save Client SSID and passphrase
  console.log('Saving client settings...')
  const clientSettings = 'country=US\n' +
    'ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n' +
    'update_config=1\n' +
    'network={\n' +
    '    ssid="' + settings['client-ssid'] + '"\n' +
    '    psk="' + settings['client-passphrase'] + '"\n' +
    '    id_str="AP1"\n' +
    '}'
  fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', clientSettings, (err) => {
    if (err) {
      console.log(err)
      return
    }
  })

  // Save server address and stream key
  console.log('Saving server settings...')
  const serverSettings = '["-y","-hide_banner","-re","-f","video4linux2","-standard","NTSC","-i","/dev/video0","-c:v","h264_omx","-an","-f","flv","rtmp://' + settings['server-address'] + '/live/' + settings['stream-key'] + '"]'
  // Concatonate all the settings and save them
  let newSettings = Object.assign(settings, { "stream-params": serverSettings })
  fs.writeFile('/sonostreamer/system_settings.json', JSON.stringify(newSettings), (err) => {
    if (err) {
      console.log(err)
      return
    }
  })
  console.log('System settings successfully saved')
  exec('sudo autohotspot')
  return
}

async function configureInputDevice() {
  fs.readFile('/sonostreamer/system_settings.json', (err, data) => {
    if (err) {
      console.log(err)
      return
    }
    systemSettings = JSON.parse(data)
    if (systemSettings['video-source'] == 'Composite (RCA)') {
      exec('v4l2-ctl', ["-d", "/dev/video0", "-i", "0"])
      console.log('Success - Composite')
    } else if (systemSettings['video-source'] == 'S-video') {
      exec('v4l2-ctl', ["-d", "/dev/video0", "-i", "1"])
      console.log('Success - S-video')
    } else if (systemSettings['video-source'] == 'HDMI') {
      exec('v4l2-ctl', ["-d", "/dev/video0", "-i", "0"])
      console.log('Success - HDMI')
    } else {
      console.log('Failure')
    }
  })
  return
}

function checkCaptureDevice() {
  const path = '/dev/video0'

  try {
    if (fs.existsSync(path)) {
      console.log('Capture device detected')
      status.captureDevice = true
    } else if (!fs.existsSync(path)) {
      console.log('Capture device NOT detected')
      status.captureDevice = false
    }
  } catch(err) {
    console.error(err)
    status.captureDevice = false
  }
}

function checkStreamStatus() {
  console.log('check stream status')
  find('name', 'ffmpeg', true)
    .then(function(list) {
      console.log('ffmpeg processes running: ' + list.length)
      if(list.length == 0) {
        status.stream = false
      } else {
        status.stream = true
      }
    })
    .catch(err => {
      'find ffmpeg error'
      status.stream = false
    })
}

// Timed function to send status of capture device and stream once per second via websocket
function sendStatus(websocket) {
  checkCaptureDevice()
  checkStreamStatus()
  console.log('Status to send: ' + JSON.stringify(status))
  websocket.send(JSON.stringify(status))
  setTimeout(sendStatus, 1000, websocket)
}

const app = express()

// Serve static files
app.use(express.static('public'))

// Use the JSON middleware to parse POST data
app.use(express.json())

// Load stream parameters and configure the input device
configureInputDevice()

// -------------------------------------------------------------------------------------
// Define local functions to allow user interaction endpoints to trigger system commands
// -------------------------------------------------------------------------------------

// --------------------------------------------
// Define routes for user-interaction endpoints
// --------------------------------------------

// Site root
app.get('/', (req, res) => {
  res.sendFile(__dirname + ('/index.html'))
})

// Start livestream
app.get('/stream/start',  (req, res) => {
  // Make sure the input device is properly configured
  configureInputDevice()

  // Start the livestream (requires async process)
  startLivestream()

  res.json({ message: 'Stream started' })
})

async function startLivestream() {
  const {stdout} = await execa('ffmpeg', JSON.parse(systemSettings['stream-params']))
  console.log(stdout)
}

// Stop livestream
app.get('/stream/stop', (req, res) => {
  exec('sudo killall ffmpeg')
  res.json({ message: 'Stream stopped' })
})

// Reboot system
app.get('/system/reboot', (req, res) => {
  res.json({ message: 'Rebooting system...' })
  exec('sudo reboot now')
})

// Shutdown system
app.get('/system/shutdown', (req, res) => {
  res.json({ message: 'Shutting down system...' })
  exec('sudo shutdown now')
})

// Check streaming status
app.get('/system/checkstream', (req, res) => {
  if(checkStreamStatus()) {
    console.log('Currently streaming')
  } else {
    console.log('Currently NOT streaming')
  }
})

// Check capture device status
app.get('/system/checkcapturedevice', (req, res) => {
  if(checkCaptureDevice()) {
    console.log('Capture device connected')
  } else {
    console.log('Capture device NOT connected')
  }
})

// ---------------
// Manage settings
// ---------------

// Route to html page for settings management
app.get('/settings', (req, res) => {
  res.sendFile(__dirname + '/settings.html')
})

// Route to request file in which system settings are saved
app.get('/system/settings', (req, res) => {
  res.sendFile(__dirname + '/system_settings.json')
})

// Route to change system settings from form
app.post('/system/settings', (req, res) => {
  try {
    apply(req.body)
  } catch (err) {
    console.log('Error saving settings')
    console.log(err)
    res.json({ message: 'There was an error while saving your settings' })
    return
  }

  res.json({ message: 'Settings saved successfully' })
})

app.listen(80, () => console.log('Sonostreamer client started at ' + new Date().toISOString().replace('T', ' ').substr(0, 19)))

// -------------------------
// WebSockets Implementation
// -------------------------


const wsserver = new websocket.Server({ port: 8080 })

wsserver.on('connection', websocket => {
  console.log('Connected to client')
  // When a client connects (e.g. a user opens the webpage), start running the sendStatus function once per second
  setTimeout(sendStatus, 1000, websocket)
  websocket.on('message', message => {
    console.log(`Received message from client => ${message}`)
  })
})
