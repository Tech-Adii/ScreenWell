# ScreenWell for Linux

ScreenWell uses the same study sessions, reminders, themes, and optional on-device camera checks on Linux.

## Run on Linux x64

Download the preview and its SHA-256 checksums from the [Linux release](https://github.com/Tech-Adii/ScreenWell/releases/tag/v1.14.0-linux). GitHub requires access to this private repository.

- **Ubuntu or Debian.** In the terminal, open the folder containing the setup and run `sudo apt install ./ScreenWell-1.14.0-linux-amd64.deb`. Then open **ScreenWell** from the applications menu.
- **AppImage.** In the file's properties, allow it to run as a program, then open it. You can also run `chmod +x ScreenWell-1.14.0-linux-x64.AppImage` followed by `./ScreenWell-1.14.0-linux-x64.AppImage`. If Ubuntu reports a FUSE or sandbox issue, use the `.deb` on that system.

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

The packages go in `release/`. The GitHub workflow **Build and test Linux packages** runs on changes to `main` that include files other than Markdown. You can also run it manually from **Actions**. A successful run provides an artifact named `ScreenWell-linux-x64` with packages, checksums, and verification reports.

The release packages were checked on Ubuntu 24.04. The checks ran the installed `.deb` and the extracted AppImage, and used synthetic video for the minimized-camera test. Physical webcams and other Linux desktops still need hands-on testing. [Ubuntu verification run](https://github.com/Tech-Adii/ScreenWell/actions/runs/45415738046)
