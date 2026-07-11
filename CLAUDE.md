# Sonostreamer — guidance for Claude

## What this is

The Sonostreamer is the device side of a tele-ultrasound ecosystem: a Raspberry Pi with a USB
video-capture dongle that grabs the video output of an ultrasound machine and pushes it as a
low-latency RTSP stream to a server. Remote experts watch live and coach the person holding the
probe. The owner (Eli, a physician) maintains it solo and devices are deployed to non-technical
users — reliability and simplicity beat features.

**The ecosystem spans three repos:**

| Repo | Role |
|------|------|
| `jaffamd/sonostreamer` (this repo, public) | Legacy Pi client: capture, encode, push; local control web UI |
| `jaffamd/sonobox` (private) | TypeScript successor to this client, paired with SonoCloud — new device work happens there |
| `jaffamd/sonocloud` (private) | The multi-tenant platform (see its CLAUDE.md) |
| `jaffamd/sonoserver` (public, legacy) | Single-tenant MediaMTX server, this repo's 3.0.0 target; superseded by sonocloud |

## Non-negotiable constraints

1. **Latency is the whole point.** The ffmpeg flags in `app.js` (`apply()`) are the product:
   no `-re`, `-probesize 32 -analyzeduration 0 -fflags nobuffer -flags low_delay`, hardware
   encode via `h264_v4l2m2m`, RTSP/TCP out. Default ffmpeg probing alone adds ~5s of
   *permanent* latency on a live source — never regress these without measuring glass-to-glass.
2. **Hardware realities.** Target is 64-bit Raspberry Pi OS (`h264_v4l2m2m`); the deprecated
   `h264_omx` only existed on the old 32-bit Buster image (v2.x devices). Capture devices are
   cheap USB dongles (composite/S-video/HDMI, often 720x480) — don't assume formats; test with
   the real dongle when touching capture/encode.
3. **Deployed devices auto-update from this repo's master.** The Pi compares its
   `package.json` version against GitHub raw master; a version bump makes every deployed device
   offer the update, and `systemupdate` resets local settings. Only bump the version when master
   is genuinely safe to ship, and treat pushes to master as releases.
4. **Non-technical operators.** The local web UI (port 80) is used by clinicians in the field:
   plain language, big obvious controls, no jargon.

## How it works

- `app.js` — single plain-JavaScript Express app (no build step), run under pm2 (`npm start`),
  serving the control UI on port 80 and a WebSocket status feed on port 8080 (capture device
  present / stream running / internet up, pushed every second).
- Settings live in `/sonostreamer/system_settings.json`. Saving settings via the UI regenerates
  the ffmpeg argument array (stored as a JSON-encoded string under `stream-params`) **and**
  rewrites `/etc/hostapd/hostapd.conf` + `/etc/wpa_supplicant/wpa_supplicant.conf`, then
  triggers `autohotspot`. Note: upgrading code does NOT regenerate `stream-params` — old params
  persist until the user re-saves settings.
- Streaming: `/stream/start` spawns ffmpeg with the stored params (RTSP push to
  `rtsp://<server>:8554/live/<stream-key>`); `/stream/stop` is `sudo killall ffmpeg`.
- Networking: `autohotspot` (installed to `/bin`) joins a known wifi network or falls back to
  running its own AP (`POCUS-Pi`) so users can configure wifi from a phone.
- Provisioning: `configure-sonostreamer` sets up a fresh Pi (hostapd/dnsmasq, Node 20 via
  NodeSource, ffmpeg, pm2, this app).
- Legacy pattern to be aware of: control endpoints are side-effectful GETs, and `client.js`
  hardcodes `ws://pocuspi.local:8080` — fine to clean up, but don't break the deployed UI.

## Status: legacy / maintenance mode

The SonoCloud-paired successor client lives in the private `jaffamd/sonobox` repo — new device
features go there. This repo continues to serve deployed devices that target sonoserver /
plain MediaMTX: keep it working, fix bugs, but avoid new feature surface. Remember that pushes
to master here are effectively releases to deployed devices (see constraint 3 above).

## Verification

There's no test suite and most behavior needs hardware. Minimum bar for changes:

- `node --check app.js` (and any changed JS) before committing.
- For encode/stream changes, test on a real Pi + capture dongle; measure latency by pointing
  the dongle at a running stopwatch on a screen and comparing against the viewer.
- Encoder smoke test on-device:
  `ffmpeg -f v4l2 -i /dev/video0 -c:v h264_v4l2m2m -pix_fmt yuv420p -b:v 2M -t 5 -f null -`
- Without hardware, a synthetic publish to a MediaMTX/SonoCloud target:
  `ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -c:v libx264 -preset ultrafast -tune zerolatency -g 30 -f rtsp -rtsp_transport tcp "<publish-url>"`
  (`-re` is correct *here* because the source is synthetic, not live.)

## Conventions

- Plain JavaScript, no build step, minimal dependencies — this runs on a Pi Zero-class budget
  and is maintained solo. Don't introduce TypeScript/bundlers here without being asked.
- Known dependency debt: express 4.17-era deps have open Dependabot alerts; an upgrade pass is
  welcome but must be tested on-device (execa v4→v9 and node-fetch v2→native fetch are breaking).
- Commit style: imperative summary, body explains why; `Co-Authored-By` for AI-assisted work.
