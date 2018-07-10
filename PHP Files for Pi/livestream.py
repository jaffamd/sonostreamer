#!/usr/bin/python
import os
# Set input to S-video
# Comment out or use -i 0 for composite video
os.system('v4l2-ctl -d /dev/video0 -i 1')
os.system('ffmpeg -y -re -f video4linux2 -standard NTSC -s 720x480 -i /dev/video0 -c:v h264_omx -an -f flv rtmp://yourwebsitehere.com/livestream')
