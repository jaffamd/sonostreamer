#!/bin/sh
# This script configures the SonoConnect Streambox environment on the Raspberry Pi platform
# Usage: sudo /boot/configure-streambox.sh [you will be prompted to enter the client WiFi info (the existing network)
# and your desired access point info (the network you are creating)]
# Licence: GPLv3
# Author: Elias Jaffa (@jaffa_md)
# Special thanks to: https://albeec13.github.io/2017/09/26/raspberry-pi-zero-w-simultaneous-ap-and-managed-mode-wifi/ and Darko Lukic <lukicdarkoo@gmail.com>

MAC_ADDRESS="$(cat /sys/class/net/wlan0/address)"

echo "Beginning configuration........."

# Pull the user-defined network variables from the filed loaded into the boot folder
source /boot/config_details.txt

# Populate `/etc/udev/rules.d/70-persistent-net.rules`
sudo bash -c 'cat > /etc/udev/rules.d/70-persistent-net.rules' << EOF
SUBSYSTEM=="ieee80211", ACTION=="add|change", ATTR{macaddress}=="${MAC_ADDRESS}", KERNEL=="phy0", \
  RUN+="/sbin/iw phy phy0 interface add ap0 type __ap", \
  RUN+="/bin/ip link set ap0 address ${MAC_ADDRESS}"
EOF

# Increase GPU memory for (hopefully) better encoding performance
sudo echo "gpu_mem=512" >> /boot/config.txt

# Update packages and install initial networking dependencies
sudo apt-get -y update
sudo apt-get -y upgrade
sudo apt-get -y install dnsmasq hostapd

# Populate `/etc/dnsmasq.conf`
# This allows the Pi to act as a router and hand out local IP addresses
sudo bash -c 'cat > /etc/dnsmasq.conf' << EOF
interface=lo,ap0
no-dhcp-interface=lo,wlan0
bind-interfaces
server=8.8.8.8
domain-needed
bogus-priv
dhcp-range=192.168.10.50,192.168.10.150,12h
EOF

# Populate `/etc/hostapd/hostapd.conf`
# This defines the specific settings of the access point, including name, password, security, WiFi channel, etc
sudo bash -c 'cat > /etc/hostapd/hostapd.conf' << EOF
ctrl_interface=/var/run/hostapd
ctrl_interface_group=0
interface=ap0
driver=nl80211
ssid=${AP_SSID}
hw_mode=g
channel=11
wmm_enabled=0
macaddr_acl=0
auth_algs=1
wpa=2
wpa_passphrase=${AP_PASSPHRASE}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP CCMP
rsn_pairwise=CCMP
EOF

# Populate `/etc/default/hostapd`
sudo bash -c 'cat > /etc/default/hostapd' << EOF
DAEMON_CONF="/etc/hostapd/hostapd.conf"
EOF

# Populate `/etc/wpa_supplicant/wpa_supplicant.conf`
sudo bash -c 'cat > /etc/wpa_supplicant/wpa_supplicant.conf' << EOF
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
network={
    ssid="${CLIENT_SSID}"
    psk="${CLIENT_PASSPHRASE}"
    id_str="AP1"
}
EOF

# Populate `/etc/network/interfaces`
sudo bash -c 'cat > /etc/network/interfaces' << EOF
source-directory /etc/network/interfaces.d
auto lo
auto ap0
auto wlan0
iface lo inet loopback
allow-hotplug ap0
iface ap0 inet static
    address 192.168.10.1
    netmask 255.255.255.0
    hostapd /etc/hostapd/hostapd.conf
allow-hotplug wlan0
iface wlan0 inet manual
    wpa-roam /etc/wpa_supplicant/wpa_supplicant.conf
iface AP1 inet dhcp
EOF

# Populate `/bin/start_wifi.sh`
sudo bash -c 'cat > /bin/start_wifi.sh' << EOF
#!/bin/bash
echo "Starting wifi......."
sleep 15
sudo ifdown --force wlan0
sudo ifdown --force ap0
sleep 15
sudo ifdown --force wlan0
sudo ifdown --force ap0
sudo ifup ap0
sudo ifup wlan0
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -s 192.168.10.0/24 ! -d 192.168.10.0/24 -j MASQUERADE
sudo systemctl restart dnsmasq
echo "Wifi script finished running"
EXTIP="$(dig +short myip.opendns.com @resolver1.opendns.com)"
echo "External IP address is $EXTIP"
EOF
sudo chmod +x /bin/start_wifi.sh

# Modify '/etc/rc.local' to run the start_wifi script on reboot
sudo bash -c 'cat > /etc/rc.local' << EOF
#!/bin/sh -e
/bin/start_wifi.sh &
exit 0
EOF

# Add the local domain name to the hosts file
sudo echo "192.168.10.1   streambox.com" >> /etc/hosts

# Give sudo access to www-data for reboot and shutdown functions
sudo usermod -aG sudo www-data
sudo echo "www-data ALL=NOPASSWD: /sbin/reboot, /sbin/shutdown" >> /etc/sudoers

sudo update-rc.d dhcpcd disable
echo "Wifi configuration is finished!"

echo "Installing additional dependencies.........."
sudo apt-get install ffmpeg -y

# Install NodeJS (from NodeSource for the latest version)
# First, update apt repo to include the NodeSource packages
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
# Now you can actually install the latest version of NodeJS
sudo apt install -y nodejs
sudo npm install pm2@latest -g
sudo pm2 startup
cd /
sudo mkdir sonostreamer
sudo chown $USER:$USER sonostreamer
cd sonoserver
npm install express --save

sudo bash -c 'cat > /sonostreamer/index.html' << EOF
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    
    <script type="text/javascript">
        \$(document).ready(function(){
            \$('#startbutton').click(function(){
                var a = new XMLHttpRequest();
                a.open("GET","startstream.php");
                a.onreadystatechange=function(){
                    if(a.readyState==4){
                        if(a.status == 200){
                        }
                        else alert("HTTP ERROR");
                    }
                }
                a.send();
            });
            \$('#stopbutton').click(function(){
                var a = new XMLHttpRequest();
                a.open("GET","stopstream.php");
                a.onreadystatechange=function(){
                    if(a.readyState==4){
                        if(a.status == 200){
                        }
                        else alert("HTTP ERROR");
                    }
                }
                a.send();
            });
            \$('#rebootbutton').click(function(){
                var a = new XMLHttpRequest();
                a.open("GET","reboot.php");
                a.onreadystatechange=function(){
                    if(a.readyState==4){
                        if(a.status == 200){
                        }
                        else alert("HTTP ERROR");
                    }
                }
                a.send();
            });
            \$('#shutdownbutton').click(function(){
                var a = new XMLHttpRequest();
                a.open("GET","shutdown.php");
                a.onreadystatechange=function(){
                    if(a.readyState==4){
                        if(a.status == 200){
                        }
                        else alert("HTTP ERROR");
                    }
                }
                a.send();
            });
	    \$('#newwifibutton').click(function(){
                window.location.href = "addwifi.php";
            });
        });
    </script>
    <title>POCUS-Pi</title>
    <style>
	button {
            margin: auto;
            width: 50%;
            max-width: 400px;
            font-size: 24px;
            text-align: center;
            padding: 20px;
            margin-top: 40px;
            box-shadow: 6px 6px 3px grey;
            display: block;
        }
    </style>
  </head>
  <body>
    <button id="startbutton">Start Livestream</button>
    <button id="stopbutton">Stop Livestream</button>
    <button id="newwifibutton">Add WiFi Network</button>
    <button id="rebootbutton">Reboot System</button>
    <button id="shutdownbutton">Shutdown System</button>
  </body>
  <script src="./scripts.js"></script>
</html>
EOF

# Create javascript files for index page
sudo bash -c 'cat > /sonostreamer/scripts.js' << EOF

EOF

# Create PHP script files
sudo bash -c 'cat > /var/www/html/addwifi.php' << EOF
<?php
  \$ssid = \$psk = "";
  if (\$_SERVER["REQUEST_METHOD"] == "POST") {
    if (empty(\$_POST["ssid"])) {
      \$nameErr = "Network name is required";
    } else {
      \$ssid = test_input(\$_POST["ssid"]);
    }

    if (empty(\$_POST["psk"])) {
      \$nameErr = "Password is required";
    } else {
      \$psk = test_input(\$_POST["psk"]);
    }

    if ((\$ssid != "") && (\$psk != "")) {
      \$file = fopen("/etc/wpa_supplicant/wpa_supplicant.conf", "r") or die("Unable to open wpa_supplicant.conf");

      \$x=1;
      \$lastAP = "";

      while (!feof(\$file)) {
        \$line = fgets(\$file);
        if (strpos(\$line, "id_str") !== false) {
          \$lastAP = "AP" . \$x;
          \$x++;
        }
      }
      fclose(\$file);

      \$file = fopen("/etc/wpa_supplicant/wpa_supplicant.conf", "a") or die("Unable to open wpa_supplicant.conf");
      \$strtowrite = PHP_EOL . 'network={' . PHP_EOL . '    ssid="' . \$ssid . '"' . PHP_EOL . '    psk="' . \$psk . '"' . PHP_EOL . '    id_str="AP' . \$x . '"' . PHP_EOL . '}';
      fwrite(\$file, \$strtowrite) or die("Unable to write file!");
      fclose(\$file);

      \$file = fopen("/etc/network/interfaces", "a") or die('Unable to open network/interfaces');
      \$strtowritenetwork = PHP_EOL . 'iface AP' . \$x . ' inet dhcp';
      fwrite(\$file, \$strtowritenetwork) or die("Unable to write to network interfaces file");
      fclose(\$file);

      header("Location: index.html");
    }
  }

  function test_input(\$data) {
    \$data = trim(\$data);
    \$data = stripslashes(\$data);
    \$data = htmlspecialchars(\$data);
    return \$data;
  }
?>
<html>
<head>
  <meta charset="utf-8">
  <title>Add WiFi Network Details</title>
  <style>
    .error {color: #FF0000;}
  </style>
</head>

<body>
  <form action="<?php echo htmlspecialchars(\$_SERVER["PHP_SELF"]);?>" method="post">
  WiFi Network Name: <input type="text" name="ssid"><span class="error">* <?php echo \$nameErr;?></span><br><br>
  WiFi Network Password: <input type="text" name="psk"><span class="error">* <?php echo \$nameErr;?></span><br><br>
  <input type="submit">
  </form>
</body>
</html>
EOF

sudo bash -c 'cat > /var/www/html/startstream.php' << EOF
<?php
exec('./livestream.py');
?>
EOF

sudo bash -c 'cat > /var/www/html/stopstream.php' << EOF
<?php
exec("killall ffmpeg");
?>
EOF

sudo bash -c 'cat > /var/www/html/shutdown.php' << EOF
<?php
exec("sudo shutdown now");
?>
EOF

sudo bash -c 'cat > /var/www/html/reboot.php' << EOF
<?php
exec("sudo reboot now");
?>
EOF

sudo bash -c 'cat > /var/www/html/livestream.py' << EOF
#!/usr/bin/python
import os
# Set input type: 0 for composite, 1 for S-video
os.system('v4l2-ctl -d /dev/video0 -i 0')
os.system('ffmpeg -y -re -f video4linux2 -standard NTSC -i /dev/video0 -c:v h264_omx -an -f flv rtmp://YOUR-IP-HERE/live/livestream')
EOF

# Change file permissions for important files
sudo chown -R pi: /var/www/html
sudo chown www-data: /var/www/html/index.html
sudo chmod 644 /var/www/html/index.html
sudo chown pi: /var/www/html/livestream.py
sudo chmod 755 /var/www/html/livestream.py
sudo chown www-data: /var/www/html/*.php
sudo chmod 644 /var/www/html/*.php
sudo chmod ugo+w /etc/wpa_supplicant/wpa_supplicant.conf
sudo chmod ugo+w /etc/network/interfaces

# Give the webpage access to the video device
sudo usermod -a -G video www-data

# Give the user access to the video device
sudo chmod ugo+rw /dev/video0

echo "System configuration complete. Please reboot your Pi now....."
