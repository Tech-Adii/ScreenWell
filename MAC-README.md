# ScreenWell for MacBook — build handoff

This folder is the **version 1.9 build kit** for both Apple Silicon (`arm64`, M-series) and Intel (`x64`) MacBooks. It includes the latest Eye Rest section, notification-to-exercise routing, guided stretches, optional voice and study-session pausing. The final Mac app still needs to be built and tested on macOS.

## Build on a Mac

Install Node.js 24 LTS or newer from [nodejs.org](https://nodejs.org/), unzip this kit, and double-click **Build-on-Mac.command**. If Finder does not treat it as executable, open Terminal in the extracted folder and run `bash Build-on-Mac.command`.

The script installs build dependencies, prepares/checks bundled assets, runs unit tests, builds both architectures, verifies package contents/signatures, and runs a camera-free launch check for the current Mac's architecture. Build-time internet access is needed. The resulting app runs offline.

When successful, the `release` folder contains:

- `ScreenWell-1.9.0-mac-arm64.dmg` for M-series MacBooks.
- `ScreenWell-1.9.0-mac-x64.dmg` for Intel MacBooks.
- Matching ZIP packages and architecture-specific validation records.

Open the matching DMG and copy ScreenWell to Applications. These are **ad-hoc signed local previews, not Apple-notarized distribution releases**. A school-managed Mac may reject them. Do not disable device security; use an approved signed/notarized build for distribution.

## Build without owning a Mac

Upload this source tree to your own GitHub repository, including `.github/workflows/macos-preview.yml`. Under Actions, select **Build Mac previews → Run workflow**. Successful jobs provide separate Apple Silicon and Intel artifacts. This workflow is manual, has read-only repository permissions, and does not publish a release. GitHub plan usage limits may apply. No workflow has been dispatched from this Windows workspace.

## Mac-specific behavior

The app declares why it needs the camera. It only requests video after the user selects checks and gives session consent; audio capture stays off. If macOS denies camera access, allow ScreenWell under System Settings → Privacy & Security → Camera, then quit and reopen it. macOS—not the app—controls that permission.

The menu bar includes normal Mac application/edit/window menus. The Dock reopens the hidden main window. Command-K opens navigation. Closing the window stops the camera but leaves timers running in the menu-bar tray; Quit ScreenWell ends the app. Notification permission is managed in macOS System Settings; unknown delivery is not labelled blocked. Voice uses installed local English system voices, when available.

## Before presenting to your teacher

On the actual Mac, check camera consent and calibration, score-below-80 alerts, distance alerts, minimized monitoring, exercise popups and offline speech. The automated launch check does not validate a physical camera, spoken audio, other Spaces/fullscreen apps, or accuracy. macOS builds and runtime tests have **not yet run** on this Windows machine.

For public or managed-device distribution, use an Apple Developer ID certificate and Apple notarization credentials with `npm run dist:mac`; signing and notarization must be verified on the resulting artifacts. Keep credentials in your build environment, never in this kit.

References: [electron-builder platform requirements](https://www.electron.build/docs/features/multi-platform-build/), [Electron camera permission API](https://www.electronjs.org/docs/latest/api/system-preferences), [GitHub macOS runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
