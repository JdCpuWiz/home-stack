# Pantry Kiosk — Deployment Guide

Full-screen pantry inventory kiosk for a Raspberry Pi 4B with a 1920×1080 monitor and a USB or Bluetooth barcode scanner. No keyboard required during normal use.

---

## Hardware

| Component | Notes |
|---|---|
| Raspberry Pi 4B (2GB+ RAM) | Pi 4B is required — Pi Zero 2W is too underpowered for Chromium |
| 1920×1080 monitor | Connected via micro-HDMI → HDMI |
| USB or Bluetooth barcode scanner | Acts as HID keyboard — no driver needed |
| MicroSD card (16GB+) | For Raspberry Pi OS |
| Optional: USB audio dongle | Only needed if your monitor has no built-in speakers |

---

## Raspberry Pi OS Setup

### 1. Flash the OS

Use [Raspberry Pi Imager](https://www.raspberrypi.com/software/) to flash **Raspberry Pi OS (64-bit, Desktop)** to the SD card.

In the Imager advanced options (gear icon):
- Set hostname (e.g. `kiosk`)
- Enable SSH
- Set username/password
- Configure WiFi if not using ethernet

### 2. First Boot

SSH in or use a temporary keyboard to finish setup. Then install Chromium if not already present:

```bash
sudo apt update && sudo apt install -y chromium-browser
```

### 3. Disable Screen Blanking

```bash
sudo raspi-config
```

Navigate to **Display Options → Screen Blanking → No**.

On Bookworm/Wayland, `raspi-config` is the reliable way — `xset` commands only work under X11.

---

## Chromium Kiosk Autostart

### Find the HomeStack IP

On your server machine:
```bash
hostname -I
```

The kiosk URL is: `http://<SERVER_IP>:3005/kiosk`

> Example: `http://192.168.7.198:3005/kiosk`

No login is required — the kiosk page is publicly accessible on the local network.

### Configure Autostart

Raspberry Pi OS **Bookworm** (2023+) uses Wayland (Wayfire/labwc) — the old LXDE autostart path does not exist. Use an XDG autostart `.desktop` file instead, which works on both Bookworm and older Bullseye.

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/kiosk.desktop
```

Paste this content (replace IP with your server's IP):

```ini
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=bash -c 'sleep 5 && chromium --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-extensions --check-for-update-interval=31536000 --password-store=basic --app=http://192.168.7.198:3005/kiosk'
NoDisplay=true
X-GNOME-Autostart-enabled=true
```

The `--app` flag launches Chromium in app mode (no address bar, no tabs).

> **Older Bullseye/Buster (LXDE)**: If `~/.config/lxsession/LXDE-pi/autostart` exists, you can use that instead — prefix each command with `@`.

### Reboot and Test

```bash
sudo reboot
```

Chromium should launch full-screen on boot and load the kiosk page.

---

## Barcode Scanner Setup

### USB Scanner

Plug in. Works immediately — HID keyboard mode, no driver needed. Scans appear as keystrokes ending with Enter.

### Bluetooth Scanner (Tera 8100)

The Tera 8100 must be set to **Bluetooth HID** mode before pairing. HID mode makes it act as a keyboard — do not use Bluetooth SPP mode (that requires a special app and won't send keystrokes).

#### Step 1 — Set HID mode on the scanner

Scan the **"Bluetooth HID"** setup barcode from the Tera manual (Chapter 1 → Bluetooth HID Pairing, page 04). This only needs to be done once.

> **Physical shortcut**: Hold the trigger button to toggle Bluetooth HID Pairing On (long press = pairing on, second long press = pairing off — see manual page 05).

#### Step 2 — Enter pairing mode

Scan the **"Pairing"** barcode from the manual. The LED will flash blue rapidly, indicating the scanner is discoverable.

#### Step 3 — Pair on the Pi

```bash
sudo rfkill unblock bluetooth
bluetoothctl
power on
agent on
default-agent
scan on
```

Watch for a device named **`BarCode Scanner HID`** and note its MAC address. Then:

```
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
quit
```

The scanner beeps and the LED turns **solid blue** when pairing succeeds.

#### Step 4 — Verify

Open a text editor on the Pi and scan a barcode — it should type the barcode value followed by Enter.

#### Auto-reconnect

`trust` ensures the scanner reconnects automatically whenever it powers on. On reboot, turn the scanner on and it will reconnect to the Pi within a few seconds.

> **Note**: A double-press of the trigger while idle cancels pairing mode after 1 minute. If the scanner stops being discoverable, repeat Step 2.

---

## Audio Setup

The kiosk plays a short beep on successful scans (1200 Hz) and a buzzer on failures (400 Hz), plus spoken TTS feedback via the browser's Web Speech API.

### HDMI Audio (if monitor has speakers)

Set audio output to HDMI:

```bash
sudo raspi-config
# System Options → Audio → HDMI
```

### USB Audio Dongle

Plug in the dongle, then set it as the default output:

```bash
# List audio devices
aplay -l

# Set default in /etc/asound.conf (replace card number as needed)
sudo nano /etc/asound.conf
```

```
defaults.pcm.card 1
defaults.ctl.card 1
```

Test:
```bash
speaker-test -t wav -c 2
```

---

## Kiosk Usage

| Action | How |
|---|---|
| Scan item IN | Set mode to **IN** (tap button top-right), scan barcode |
| Scan item OUT | Set mode to **OUT** (tap button top-right), scan barcode |
| Unknown item | Kiosk shows QR code → scan with phone → add via `/pantry` |
| Switch modes | Tap **IN** or **OUT** button (touch screen, mouse, or a second scanner scanning the printed QR barcodes below) |

### Printed Mode-Switch Barcodes (Optional)

Print and mount two barcodes near the scanner for hands-free mode switching without touching the screen. The kiosk treats any unrecognized barcode as a product lookup — to support special commands you'd need to extend `app/api/kiosk/scan/route.ts` to detect reserved values. This is a future enhancement.

### Auto-Behavior

- **Known item**: qty adjusted immediately, green flash + beep + TTS
- **Unknown barcode (found in Open Food Facts / UPCitemdb)**: item auto-created in pantry DB, green flash + "New item created automatically" badge
- **Unknown barcode (not found anywhere)**: red flash + buzzer + QR code to `/pantry` for manual entry
- **Auto-reset**: returns to idle state after 3.5 seconds

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Black screen on boot | Check HDMI connection; ensure desktop (not Lite) OS is installed |
| Chromium not found | Binary is `chromium` on Bookworm, not `chromium-browser` — check with `which chromium` |
| Unlock Keyring popup on boot | Add `--password-store=basic` flag to the autostart Exec line |
| Chromium crashes / slow | Add `--disable-gpu` flag to the autostart command |
| No audio | Run `alsamixer` and unmute; confirm correct audio device is default |
| Scanner not typing | Check USB connection; ensure kiosk page is the active window (click anywhere) |
| Kiosk page not loading | Confirm HomeStack is running: `docker compose ps` on server |
| Page loads but shows login | Check that `kiosk` is in `middleware.ts` exclusion list (should be in v0.18.0+) |
| TTS not working | Chromium requires user interaction before AudioContext/Speech works — tap the screen once after first boot |

---

## Code References

| File | Purpose |
|---|---|
| `app/kiosk/page.tsx` | Full-screen kiosk UI |
| `app/kiosk/layout.tsx` | Bare layout (no Shell/SideNav) |
| `app/api/kiosk/scan/route.ts` | Unauthenticated scan endpoint |
| `middleware.ts` | Auth exclusion list (kiosk + api/kiosk) |

The kiosk API is **intentionally unauthenticated** — it is protected at the network level. Do not expose port 3005 to the public internet.

---

## Future Enhancements

- Quantity adjustment before confirming (requires touch UI or a dedicated key on the scanner)
- Mode-switching via special printed barcodes (detect reserved barcode values in the API route)
- Jarvis AI voice loop: Pi mic → Whisper STT → n8n → TTS response for guided item-not-found flow
- Display pantry stock warnings (out/low items) on the idle screen
