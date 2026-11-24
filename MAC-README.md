# ScreenWell for Mac

## Install the preview

1. Open **Apple menu → About This Mac** and check **Chip** or **Processor**.
2. Download the matching `.pkg`. [Apple Silicon installer](https://github.com/Tech-Adii/ScreenWell/releases/download/v1.14.0-mac-r2/ScreenWell-1.14.0-mac-arm64.pkg) · [Intel installer](https://github.com/Tech-Adii/ScreenWell/releases/download/v1.14.0-mac-r2/ScreenWell-1.14.0-mac-x64.pkg)
3. Open the package and follow macOS Installer's prompts. Then open **ScreenWell** from **Applications**.

GitHub requires access to this private repository. The installers contain ad-hoc signed apps and may be blocked on computers that require Apple notarization. [Apple Developer ID and notarization](https://developer.apple.com/developer-id/)

If your Mac is already running ScreenWell, quit it before running the installer. The Mac release also has disk images with drag-to-Applications setup. [Mac release](https://github.com/Tech-Adii/ScreenWell/releases/tag/v1.14.0-mac-r2)

## Build on a Mac

Install Node.js 24 LTS or newer, then clone or extract the repository on your Mac. Open **Build-on-Mac.command** or run `bash Build-on-Mac.command` from the project folder. [Node.js downloads](https://nodejs.org/)

The script installs build dependencies, prepares/checks bundled assets, runs unit tests, builds both architectures, verifies package contents/signatures, and runs a camera-free launch check for the current Mac's architecture. Build-time internet access is needed. The resulting app runs offline.

When successful, the `release` folder contains:

- `ScreenWell-<version>-mac-arm64.dmg` for M-series MacBooks.
- `ScreenWell-<version>-mac-x64.dmg` for Intel MacBooks.
- Matching ZIP packages and architecture-specific validation records.

Open the matching DMG and copy ScreenWell to Applications. These are **ad-hoc signed local previews, not Apple-notarized distribution releases**. A school-managed Mac may reject them. Do not disable device security; use an approved signed/notarized build for distribution.

## Build without owning a Mac

In the ScreenWell repository, open **Actions → Build Mac previews → Run workflow**. Successful jobs provide separate Apple Silicon and Intel artifacts. If you select **publish_preview**, GitHub verifies both disk images and publishes them as a prerelease. GitHub plan usage limits may apply.

Run **Build Mac installers** after publishing a version's disk images to build and verify the matching `.pkg` files and add them to that release.

## Mac-specific behavior

The app declares why it needs the camera. It only requests video after the user selects checks and gives session consent; audio capture stays off. If macOS denies camera access, allow ScreenWell under System Settings → Privacy & Security → Camera, then quit and reopen it. macOS—not the app—controls that permission.

The menu bar includes normal Mac application/edit/window menus. The Dock reopens the hidden main window. Command-K opens navigation. Closing the window stops the camera but leaves timers running in the menu-bar tray; Quit ScreenWell ends the app. Notification permission is managed in macOS System Settings; unknown delivery is not labelled blocked. Voice uses installed local English system voices, when available.

## Before presenting to your teacher

Both corrected previews passed signature, architecture, package-content and offline launch checks on macOS 26. On your Mac, test any features you plan to demonstrate that use the physical webcam, spoken audio, or other Spaces and fullscreen apps. [macOS verification run](https://github.com/Tech-Adii/ScreenWell/actions/runs/45431360600)

For public or managed-device distribution, use an Apple Developer ID certificate and Apple notarization credentials with `npm run dist:mac`; signing and notarization must be verified on the resulting artifacts. Keep credentials in your build environment, never in this kit.

References: [electron-builder platform requirements](https://www.electron.build/docs/features/multi-platform-build/), [Electron camera permission API](https://www.electronjs.org/docs/latest/api/system-preferences), [GitHub macOS runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
