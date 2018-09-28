# SonoConnect Streambox by JaffaMD

The SonoConnect Streambox is an open-source hardware platform designed to enable extremely low-cost tele-ultrasound, thus facilitating education and healthcare capacity in the developing world. There are undoubtedly many other uses for a simple and inexpensive video streaming device, so if you'd like to share your thoughts, please get in touch (@jaffa_md on Twitter or by email at globalpocuspartners (a) gmail dot com)!

## Major Steps
1. Set up the Raspberry Pi
2. Set up the server
3. Start livestreaming

See the parts list for a full list of required parts along with some helpful links to get started.

## Set up the Raspberry Pi
Start by downloading the latest version of Raspbian, an operating system for the Raspberry Pi, from [this website](https://www.raspberrypi.org/downloads/raspbian/). You should download the "Lite" version in order to conserve space, since you won't be using the graphical interface once the device is set up anyway. You'll also need a program to "flash" the operating system image onto a microSD card. There are plenty of programs that can do this, but my favorite is [Etcher](https://etcher.io/). Download and install Etcher, insert the blank microSD card into your computer (you may need an adapter if you only have a full-sized SD card slot, which most microSD cards will come with), and follow the prompts to flash the Raspbian image onto the microSD card.

When the image is done flashing, open any plain text editing software (Notepad on Windows or TextEdit on Mac; avoid "word processors" like Microsoft Word) and save a blank document as "ssh" in the main directory of your microSD card (which should now be called "boot"). Make sure you don't give the "ssh" file an extension, and if it automatically gets the extension ".txt", remove it (if prompted, just choose "use without extension" or something along those lines). After that's done, copy the `configure.sh` file to the same main folder on the "boot" disk. You can now safely eject the microSD card.

Place the SD card in the Raspberry Pi's card slot, then connect your Pi directly to your internet router with an Ethernet cable. Make sure you also connect your TV capture card to a USB port. Finally, connect the power cable to the Pi to turn it on.

Once the Pi boots up, you should be able to connect by SSH. There should be an IP address listed on the side of your router (something like 192.168.1.\*) where you can see all the devices on your local network. Find the IP address of the Pi (it will be called "raspberrypi"). On Windows, you'll need an SSH program like [PuTTY](https://www.putty.org/). On Mac, just open a terminal and type `ssh pi@192.169.1.*` (replace with the Pi's actual IP address). When prompted for a password, enter the default password (`raspberry`).

Enter the command `passwd` to change the password. Use something secure.

## _MAJOR UPDATE (9.28.18)_
The `configure.sh` file (linked above) has been heavily modified. It will now perform basically the entire configuration and setup process automatically, including updating the existing Raspberry Pi system files, installing the dependencies, setting up the WiFi system for simultaneous AP and client WiFi networks, creating and populating the webpage files for controlling the Streambox's livestreaming capabilities, and setting appropriate file permissions. Simply run the command `sudo /boot/configure.sh`, answer the prompts to enter information regarding client and desired access point network information, sit back, relax, and let the magic of computers take care of the rest.
>NOTE: The `configure.sh` file has a deliberate typo in it. Near the very bottom of the file, you'll see the code to populate the final webpage file called `/var/www/html/livestream.py` . The line just before `EOF` is the code for running the actual streaming script (it should read `os.system('ffmpeg -y -re -f video4linux2 -standard NTSC -i /dev/video0 -c:v h264_omx -an -f flv rtmp://yourwebsitehere.com/livestream')`). Note the web address of the stream - `yourwebsitehere.com` - this is obviously up to you to register a website domain name and connect it to your streaming server (SEE BELOW).

Once the setup script is done (yes, it will take a while) you can reboot the Pi with `sudo reboot now`
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
