# Sonostreamer by JaffaMD

The Sonostreamer (aka "Streambox 2.0") is an open-source device designed to enable extremely low-cost tele-ultrasound, thus facilitating education and healthcare capacity in both the developing and the developed world. There are undoubtedly many other uses for a simple and inexpensive video streaming device, so if you'd like to share your thoughts, please get in touch (@jaffa_md on Twitter or by email at ejaffa (a) globalpocuspartners dot com)!

>NOTE: This is the first major update since the original release of the "Streambox" platform. The repository has now been split into this one for the Sonostreamer itself and a [separate repository for the server-side software](https://github.com/jaffamd/sonoserver) to process the live videostreams.

## Setting up the Sonostreamer

### Method #1: Custom Image (easiest)

- Download the pre-built image [here](https://jaffamd.com/streambox2.html)
- Flash the image to a microSD card with [balenaEtcher](https://www.balena.io/etcher/)
- Insert the microSD card into the Pi, insert the capture device into the USB port, and connect the Pi to power
- Wait ~30-60 seconds for the system to start up and the wifi hotspot to stabilize
- Connect to the wifi hotspot

> Default network name: `POCUS-Pi`

> Default network password: `pocuspi01`
- Open a browser and navigate to `http://pocuspi.local`
- Select `Settings / Wifi`
- Change the client wifi details to match your existing wifi network details (this should trigger the "autohotspot script" to shut down the hotspot and connect to the client wifi instead, but you may need to push the `Reboot System` button to force the reconnection)
- After giving the system a minute or so to reboot / reconnect, go to `http://pocuspi.local` again and choose the `Start Livestream` button to begin streaming

>Upon startup, if the device finds a known wifi network, it will connect to that automatically. If not, it will start the local hotspot so you can connect (as above) and add new wifi details.

### Method #2: Roll Your Own (requires comfort with a command line interface)

Start by downloading the [latest version of Raspberry Pi OS here](https://www.raspberrypi.org/downloads/raspbian/). As above, use balenaEtcher to flash the image onto a microSD card. The card will automatically "eject", so pull it out of the reader and put it back in so it shows up (it will be called `boot`).

Download the files in the [raspberrypi-startup repository](https://github.com/jaffamd/raspberrypi-startup). Open `wpa_supplicant.conf` with a lightweight text editor (preferably TextEdit on Mac or Notepad on Windows or Nano on Linux via the command line) and replace the wifi network name and passphrase with the details for your local network, then save the file and copy both files (`wpa_supplicant.conf` and `ssh`) to the `boot` drive.

Eject the microSD card, move it to the microSD card slot on the Raspberry Pi, plug in the USB capture device, and plug it into a power source. When the green LED stops flashing, it should be ready to go.

Access the Pi remotely from your computer via SSH (`ssh pi@raspberrypi.local` from the Terminal on a Mac or the equivalent command through a program like [PuTTY](https://www.putty.org/) on a Windows machine).
>Default username: `pi`

>Default password: `raspberry`

>Be sure to immediately change the default password with the `passwd` command

You can now download the repository and run the configuration script with the following commands:
```
sudo apt-get install git -y
cd /
sudo git clone https://github.com/jaffamd/sonostreamer.git
sudo chown -R pi:pi sonostreamer
cd sonostreamer
sudo ./configure-sonostreamer
```
You may need to provide input once or twice during the process, but it should be self-explanatory.

Once the script has finished running, you should reboot the system with:
```
sudo reboot now
```
Note that the Sonostreamer's control webpage will be accessible at `http://raspberrypi.local` rather than `http://pocuspi.local` unless you change the device's `hostname` (easiest way is by running the command `sudo raspi-config` and choosing `Network Options` followed by `Change hostname`).