# ScreenWell for Linux

ScreenWell uses the same study sessions, reminders, themes, and optional on-device camera checks on Linux.

## Run on Linux x64

- **Ubuntu or Debian.** In the terminal, open the folder containing the downloaded setup and run `sudo apt install ./ScreenWell-*-linux-*.deb`. Then open **ScreenWell** from the applications menu.
- **AppImage.** Open the file's properties and allow it to run as a program, then open it. You can also use `chmod +x ScreenWell-*-linux-*.AppImage` and run the AppImage from the terminal. AppImages need a compatible host. If Ubuntu reports a FUSE or sandbox issue, use the Debian package on that system.

Minimize the app to keep study sessions and selected camera checks running. The window title shows the countdown. Tray icons, tooltips, notification placement, and which windows sit on top depend on your desktop environment. Closing the window quits ScreenWell and saves the current study session for later. The numbered Windows taskbar badge is specific to Windows.

For optional spoken instructions, your Linux desktop needs Speech Dispatcher and a supported local English voice, such as eSpeak NG. Written instructions work without voice setup.

Camera checks use WebGL. If the graphics driver cannot provide a WebGL context, you can still use the study timer and reminders with the camera off.

## Build on Linux

Use Node.js 24 and npm on a 64-bit Linux build machine. A build downloads its dependencies and camera models. The installed app runs offline.

```bash
npm ci
npm run assets
npm run dist:linux
```

The packages go in `release/`. The GitHub workflow **Build and test Linux packages** builds both packages on Ubuntu after a push to `linux-support`. A successful run provides an artifact named `ScreenWell-linux-x64` with the two packages and their checksums.
