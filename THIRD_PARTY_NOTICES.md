# Third-party notices

ScreenWell code is MIT licensed. Its distribution also includes Electron/Chromium/Node/SQLite and the dependencies in `package-lock.json`. Keep the licenses supplied by electron-builder in the release, including Electron's LICENSE and Chromium's LICENSES.chromium.html.

- Electron: MIT; Chromium and Node include their upstream third-party notices. [Electron](https://www.electronjs.org/).
- React, Vite, Lucide, Recharts, Zod, pdf-lib and @pdf-lib/fontkit: see their bundled npm package licenses; generally MIT-family licenses.
- MediaPipe Tasks Vision: Apache-2.0. Models: Face Landmarker and Pose Landmarker Lite, Full, and Heavy, pinned version 1 from Google's official MediaPipe model distribution. Review the upstream model cards and terms before redistribution beyond this project. [Face model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker), [Pose model documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).
- Nunito Sans: SIL Open Font License; the license is copied to the local fonts directory.
- Noto Sans: SIL Open Font License, sourced from the official Noto fonts repository. [Noto repository](https://github.com/notofonts/noto-fonts).
- ScreenWell SVG illustrations, CSS animations, app icon, and synthesised chime were authored for this project; no external image or sound service is used.

Build-time tools (TypeScript, Vitest, Playwright, ESLint, Prettier, electron-builder and others) retain their upstream licenses. They are not required by the end user.
