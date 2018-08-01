# SonoConnect Streambox by JaffaMD

The SonoConnect Streambox is an open-source hardware platform designed to enable extremely low-cost tele-ultrasound, thus facilitating education and healthcare capacity in the developing world. There are undoubtedly many other uses for a simple and inexpensive video streaming device, so if you'd like to share your thoughts, please get in touch (@jaffa_md on Twitter or by email at globalpocuspartners (a) gmail dot com)!

## Major Steps
1. Set up the Raspberry Pi
2. Set up the server
3. Start livestreaming

See the parts list for a full list of required parts along with some helpful links to get started.

## Set up the Raspberry Pi
Start by downloading the latest version of Raspbian, an operating system for the Raspberry Pi, from [this website](https://www.raspberrypi.org/downloads/raspbian/). You should download the "Lite" version in order to conserve space, since you won't be using the graphical interface once the device is set up anyway. You'll also need a program to "flash" the operating system image onto a microSD card. There are plenty of programs that can do this, but my favorite is [Etcher](https://etcher.io/). Download and install Etcher, insert the blank microSD card into your computer (you may need an adapter if you only have a full-sized SD card slot, which most microSD cards will come with), and follow the prompts to flash the Raspbian image onto the microSD card.

When the image is done flashing, open any plain text editing software (Notepad on Windows or TextEdit on Mac; avoid "word processors" like Microsoft Word) and save a blank document as "ssh" in the main directory of your microSD card (which should now be called "boot"). Make sure you don't give the "ssh" file an extension, and if it automatically gets the extension ".txt", remove it (if prompted, just choose "use without extension" or something along those lines). You can now safely eject the microSD card.

Place the SD card in the Raspberry Pi's card slot, then connect your Pi to your internet router with an Ethernet cable. Make sure you also connect your TV capture card to a USB port. Finally, connect the power cable to the Pi to turn it on.

Once the Pi boots up, you should be able to connect by SSH. There should be an IP address listed on the side of your router (something like 192.168.1.\*) where you can see all the devices on your local network. Find the IP address of the Pi (it will be called "raspberrypi"). On Windows, you'll need an SSH program like [PuTTY](https://www.putty.org/). On Mac, just open a terminal and type `ssh pi@192.169.1.*` (replace with the Pi's actual IP address). When prompted for a password, enter the default password (`raspberry`).

Enter the command `passwd` to change the password. Use something secure.

Transfer the `configure.sh` file to the Pi (`scp` is the [secure file transfer protocol over SSH](https://research.csc.fi/csc-guide-copying-files-from-linux-and-mac-osx-machines-with-scp)). Run it with:
~~~~
sudo ./configure.sh rpi-wifi -a POCUS-Pi [access point password] -c [client ssid] [client wifi password]
~~~~
>Note: I recommend setting up a wireless hotspot on your cellphone and using that as the "client wifi" for the Pi. That way, you'll always have that same wifi network when streaming. Enterprise wifi networks tend to have a lot of extra security that makes it difficult or impossible to connect something like a Pi.
This will take some time to set up, so go get a coffee or something...

Once the access point configuration is done, it will tell you to restart. Don't (you'll probably lose your connection to the box; don't worry, this step comes later).

Install a few new packages with the following commands:
~~~~
sudo apt-get install patchutils libproc-processtable-perl -y
sudo apt-get install ffmpeg -y
sudo apt-get install git -y
sudo apt-get install apache2 -y
sudo apt-get install php libapache2-mod-php -y
~~~~
The above commands install a few important programs. The first one installs several libraries, which are used by the program installed by the second command, ffmpeg. ffmpeg is an exceptional open-source video encoding program, which does basically all the heavy lifting for the Streambox platform. Git is just the commandline version of GitHub (you're already on it!). Apache2 and PHP are tools we'll use to essentially host a webpage on the Pi so we can access its functions without having to use the commandline through SSH.

Change the file permissions of the web root folder with `sudo chown -R pi: /var/www/html` (you may be prompted for your password). Now you can remove the stand-in `index.html` file with:
~~~~
sudo rm /var/www/html/index.html
~~~~

At this point, you should transfer the files from the folder "PHP Files for Pi" to the `/var/www/html` folder on the Pi using the `scp` command as above.

Give the webpage permission to access the video input with:
~~~~
sudo usermod -a -G video www-data
~~~~

Your TV capture card should be connected to the Pi already, so make sure you have access to it by checking:
~~~~
sudo ffmpeg -sources
~~~~

You should see a long list, in which the lines
>Auto-detected sources for video4linux2,v4l2:

>/dev/video0

should appear. If it's a different number, just substitute that number below.

Make sure to change the capture card's permissions with:
~~~~
sudo chmod ugo+rw /dev/video0
~~~~

The script for starting the livestream should already be in the `html` folder, so make it executable with:
~~~~
sudo chmod +x /var/www/html/livestream.py
~~~~
>Note: The livestream script has a deliberate typo. The website it will stream to is "rtmp://yourwebsitehere.com/livestream". You will need to replace "yourwebsitehere" with your own domain, or at least the IP address of your streaming server (see below). This can be accomplished with Raspbian's built-in text editor "nano" - `sudo nano /var/www/html/livestream.py`

Now you can reboot the Pi with `sudo reboot now`
Give it a good 5 minutes to reboot and set up again the first time. At some point, you should a new WiFi network show up on your list, called `POCUS-Pi`. If you don't, unplug the Pi and plug it back in to force a second restart. It should work at that point.

If everything worked, you should be able to connect to the new network with the password you chose above. Once connected, you can directly access the Pi through SSH with:
~~~~
ssh pi@192.168.10.1
~~~~
>Keep in mind that this will only work if you're connected to the Pi's network.

## Set up the server
One of the cheapest and easiest ways to set up a server is through a service like [Digital Ocean](digitalocean.com). You can create a basic server with most of the software already installed for as little as $5/month. This guide will be assuming you make a "droplet" (mini-server) on Digital Ocean.

After creating an account with Digital Ocean, create a droplet with a pre-built LAMP stack, which stands for Linux-Apache-MySQL-PHP. If you're hosting your own streaming server locally (my first one was a nearly-decade-old Macbook Pro sitting on my dining room table), find [a tutorial like this one](https://code.tutsplus.com/tutorials/how-to-set-up-a-dedicated-web-server-for-free--net-2043), which is the one I followed to install my first server.

Once your server is up and running, you can use `ssh` to login just as you did with the Raspberry Pi above. For security purposes, if you are logged in as `root`, you should create a separate username and give it root privileges (but be sure to use different passwords for the two user accounts):

`adduser USERNAME`

`usermod -aG sudo USERNAME`

Check the sudo privileges:

`su USERNAME`

`sudo ls -la /root`
>Enter the new user's password (not the password for the root user). Note that this command will not work if sudo privileges were not properly granted.

`exit`
>This will return you to the root user's account

`logout`
>This will log you out of the root user's account. At this point, you should `ssh` back into the server under the new non-`root` username.

### Install the NGINX-RTMP server software
The protocol we'll use to livestream video is called RTMP (Real-Time Messaging Protocol). Apache is not built to accept RTMP videostreams, but a modified version of the NGINX (pronounced 'engine ex') server works just fine. While logged into the server over SSH, enter the following series of commands:

~~~
sudo apt-get update
sudo apt-get upgrade
sudo apt upgrade
sudo apt-get install gcc libpcre3 libpcre3-dev libssl-dev build-essential -y
wget http://nginx.org/download/nginx-1.14.0.tar.gz
git clone https://github.com/winshining/nginx-http-flv-module.git
tar -xzf nginx-1.14.0.tar.gz
sudo rm nginx-1.14.0.tar.gz
cd nginx-1.14.0
./configure --add-module=../nginx-http-flv-module
make
sudo make install
sudo ufw allow 1935
~~~

Once that is all done, you'll need to replace the NGINX configuration file with one that supports our livestreaming application.

~~~
sudo nano /usr/local/nginx/conf/nginx.conf
~~~

Hold down `ctrl+k` until all the lines are deleted, and then paste in the contents of the new configuration file (found in this repository under `streambox/Server Files/nginx.conf`). Press `ctrl+o` followed by `enter` to save and `ctrl+x` to quit the nano text editor.
>NOTE: There are a few places near the end of the configuration file that contain a domain name (ex: github.com). I've replaced these with SERVER_DOMAIN_NAME. I strongly recommend you purchase a domain name on a site like [GoDaddy](godaddy.com) and replace the SERVER_DOMAIN_NAME with your own domain name. I have not tested this system with just an IP address rather than a domain name and cannot guarantee that it will work out.

Finally, stop the Apache server software that was running by default and start the NGINX server software instead:

~~~
sudo /etc/init.d/apache2 stop
sudo /usr/local/nginx/sbin/nginx
~~~

## Start Streaming
All that's left to do at this point is to start streaming! Make sure your ultrasound machine is plugged into your capture card, which is plugged into your Streambox, and then power up the Streambox. Once the POCUS-Pi WiFi network shows up, connect your phone or computer to the network, open a web browser (Chrome should definitely work; others may be spotty), and navigate to `192.168.10.1`. You should see several buttons at this point. Start the livestream by pressing or clicking the "Start Livestream" button.

### View the stream
The easiest way to view the livestream is with VLC, a free video player that you can [download here](https://www.videolan.org/vlc/index.html). Open up VLC, click File in the menu bar and click Open Network. This will open a dialog box with an input field. In that field, enter:
`rtmp://SERVER_DOMAIN_NAME.com/livestream`
There will be a delay of a few seconds while the videostream buffers, and then your video should start playing automatically. When you're done streaming, make sure to hit the "Stop Livestream" button on the Streambox's webpage.
