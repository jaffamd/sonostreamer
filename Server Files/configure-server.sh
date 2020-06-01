#!/bin/sh
# This script configures a Ubuntu server for use with the Sonostreamer platform
# Licence: GPLv3
# Author: Elias Jaffa (@jaffa_md)

#######
# HELP
#######
Help()
{
  # Display help text
  echo "Automatic server setup for the Sonostreamer platform"
  echo
  echo "Usage: sudo configure-server | -h"
  echo
  echo "Options:"
  echo
  echo "-h     Display this help text"
}

while getopts ":h" option; do
   case $option in
      h) # display Help
        Help
        exit;;
      /?) # incorrect option
        echo "Error: Invalid option"
        exit;;
   esac
done

echo "Beginning server configuration........."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt upgrade -y

# Install dependencies and utilities
sudo apt-get install build-essential gcc autoconf automake cmake libtool git -y

# Install ffmpeg
#sudo apt-get install gcc libpcre3 libpcre3-dev libssl-dev
wget https://ffmpeg.org/releases/ffmpeg-4.2.1.tar.bz2
tar -xf ffmpeg-4.2.1.tar.bz2
rm ffmpeg-4.2.1.tar.bz2
cd ffmpeg-4.2.1

./configure --enable-gpl --enable-version3 --disable-static --enable-shared --enable-small --enable-avisynth --enable-chromaprint --enable-frei0r --enable-gmp --enable-gnutls --enable-ladspa --enable-libaom --enable-libass --enable-libcaca --enable-libcdio --enable-libcodec2 --enable-libfontconfig --enable-libfreetype --enable-libfribidi --enable-libgme --enable-libgsm --enable-libjack --enable-libmodplug --enable-libmp3lame --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libopenmpt --enable-libopus --enable-libpulse --enable-librsvg --enable-librubberband --enable-librtmp --enable-libshine --enable-libsmbclient --enable-libsnappy --enable-libsoxr --enable-libspeex --enable-libssh --enable-libtesseract --enable-libtheora --enable-libtwolame --enable-libv4l2 --enable-libvo-amrwbenc --enable-libvorbis --enable-libvpx --enable-libwavpack --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxvid --enable-libxml2 --enable-libzmq --enable-libzvbi --enable-lv2 --enable-openal --enable-opencl --enable-opengl --enable-libdrm

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
sudo wget https://raw.githubusercontent.com/jaffamd/streambox/master/Server%20Files/nginx.conf
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
