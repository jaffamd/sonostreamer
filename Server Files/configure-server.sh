#!/bin/sh
# This script configures a Ubuntu 16.04 server for use with the SonoConnect Streambox platform
# Usage: sudo ./configure-server.sh
# Licence: GPLv3
# Author: Elias Jaffa (@jaffa_md)

echo "Beginning server configuration........."
sudo apt-get -y update
sudo apt-get -y upgrade
sudo apt -y upgrade

# Install dependencies
sudo apt-get install gcc libpcre3 libpcre3-dev libssl-dev build-essential -y

# Download the modified version of the Nginx server software, compile the source code, and install it
wget http://nginx.org/download/nginx-1.14.0.tar.gz
git clone https://github.com/winshining/nginx-http-flv-module.git
tar -xzf nginx-1.14.0.tar.gz
sudo rm nginx-1.14.0.tar.gz
cd nginx-1.14.0
./configure --add-module=../nginx-http-flv-module
make
sudo make install
cd

# Remove the Apache2 server software
sudo apt-get purge apache2
sudo apt-get autoremove

# Poke a hole in the firewall for incoming RTMP streams
sudo ufw allow 1935

# Create a new user for the Nginx software worker process
sudo useradd nginx

# Download the Nginx configuration file
cd /usr/local/nginx/conf
sudo rm nginx.conf
wget https://github.com/jaffamd/streambox/blob/master/Server%20Files/nginx.conf
cd

# Create folder for video recordings and set permissions
sudo mkdir /rec
sudo chown nginx: /rec

# Make it possible to start the Nginx server on server reboot without a password
sudo echo "%sudo ALL=NOPASSWD: /usr/local/nginx/sbin/nginx" >> /etc/sudoers
sudo echo "" >> .bashrc
sudo echo "alias nginx='sudo /usr/local/nginx/sbin/nginx'" >> .bashrc
sudo echo "nginx" >> .bashrc

echo "Server configuration complete. Please restart your server now."
