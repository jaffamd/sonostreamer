#!/bin/bash
bash -c 'cat > /var/www/html/updated.txt' << EOF
Your system has been updated! Congratulations!
EOF
sudo reboot now
