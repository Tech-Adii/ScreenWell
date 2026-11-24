# ScreenWell for MacBook — build handoff

Use this source tree to build local ScreenWell previews for Apple Silicon (`arm64`, M-series) and Intel (`x64`) MacBooks. The macOS preview still needs to be built and tested on macOS.

## Build on a Mac

Install Node.js 24 LTS or newer, then clone or extract the repository on your Mac. Open **Build-on-Mac.command** or run `bash Build-on-Mac.command` from the project folder. [Node.js downloads](https://nodejs.org/)

The script installs build dependencies, prepares/checks bundled assets, runs unit tests, builds both architectures, verifies package contents/signatures, and runs a camera-free launch check for the current Mac's architecture. Build-time internet access is needed. The resulting app runs offline.

When successful, the `release` folder contains:

- `ScreenWell-<version>-mac-arm64.dmg` for M-series MacBooks.
- `ScreenWell-<version>-mac-x64.dmg` for Intel MacBooks.
- Matching ZIP packages and architecture-specific validation records.

Open the matching DMG and copy ScreenWell to Applications. These are **ad-hoc signed local previews, not Apple-notarized distribution releases**. A school-managed Mac may reject them. Do not disable device security; use an approved signed/notarized build for distribution.

## Build without owning a Mac

In the ScreenWell repository, open **Actions → Build Mac previews → Run workflow**. Successful jobs provide separate Apple Silicon and Intel artifacts. The workflow uses read-only repository permissions and stores builds as Actions artifacts. GitHub plan usage limits may apply.

## Mac-specific behavior

The app declares why it needs the camera. It only requests video after the user selects checks and gives session consent; audio capture stays off. If macOS denies camera access, allow ScreenWell under System Settings → Privacy & Security → Camera, then quit and reopen it. macOS—not the app—controls that permission.

The menu bar includes normal Mac application/edit/window menus. The Dock reopens the hidden main window. Command-K opens navigation. Closing the window stops the camera but leaves timers running in the menu-bar tray; Quit ScreenWell ends the app. Notification permission is managed in macOS System Settings; unknown delivery is not labelled blocked. Voice uses installed local English system voices, when available.

## Before presenting to your teacher

On the actual Mac, check camera consent and calibration, score-below-80 alerts, distance alerts, minimized monitoring, exercise popups and offline speech. The automated launch check does not validate a physical camera, spoken audio, other Spaces/fullscreen apps, or accuracy. macOS builds and runtime tests have **not yet run** on this Windows machine.

For public or managed-device distribution, use an Apple Developer ID certificate and Apple notarization credentials with `npm run dist:mac`; signing and notarization must be verified on the resulting artifacts. Keep credentials in your build environment, never in this kit.

References: [electron-builder platform requirements](https://www.electron.build/docs/features/multi-platform-build/), [Electron camera permission API](https://www.electronjs.org/docs/latest/api/system-preferences), [GitHub macOS runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
