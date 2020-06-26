const express = require('express')
const fs = require('fs')
const { exec, spawn } = require('child_process')
var livestream
var hotspot
var systemSettings

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
  triggerHotspot()
  return
}

function triggerHotspot() {
  var hotspot = spawn("hotspot")

  hotspot.stdout.on("data", data => {
    console.log(`stdout: ${data}`)
  })

  hotspot.stderr.on("data", data => {
    console.log(`stderr: ${data}`)
  })

  hotspot.on('error', (error) => {
    console.log(`error: ${error.message}`)
  })

  hotspot.on("close", code => {
    console.log(`child process exited with code ${code}`)
  })
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

  // Start the livestream process
  livestream = spawn('ffmpeg', JSON.parse(systemSettings['stream-params']))

  livestream.on('exit', (code, signal) => {
    res.json({ message: `child process exited with code ${code} and signal ${signal}` })
  })

  res.json({ message: 'Stream started' })
})

// Stop livestream
app.get('/stream/stop', (req, res) => {
  livestream.kill()
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
