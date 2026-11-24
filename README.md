# ScreenWell

**Rest your eyes. Reset your posture.** A private Windows desktop companion for students. Built for Applied Design Thinking Lab (CS238DL), supporting SDG 3: Good Health and Well-being.

ScreenWell runs offline after installation. It has no account, backend, telemetry, CDN, or automatic updates. Camera use is optional. Reminders can always be snoozed, skipped, disabled, or paused with Important task mode. This is general habit support, not a medical device.

## Open the app

**MacBook:** macOS support is prepared in source, with Apple Silicon and Intel targets. No runnable Mac package has been built on this Windows host. Use [MAC-README.md](MAC-README.md) and `Build-on-Mac.command` on a Mac, or the manual macOS GitHub Actions workflow.

Download [ScreenWell 1.14.0 Setup](https://github.com/Tech-Adii/ScreenWell/releases/tag/v1.14.0) for Windows x64. Local builds put the same versioned installer in `release/`. If you are updating, first choose **Quit ScreenWell** from the icon near the clock. Setup installs for the current Windows user and creates desktop and Start menu shortcuts. Your settings and study history stay in your Windows profile.

This installer is unsigned. Windows Smart App Control may block it on protected PCs. The [validation record](VALIDATION.md) lists what was tested for this release.

In **Study session → Study Profiles**, choose Quick Review, Balanced Study, or Practice Exam to fill the planner and preview the schedule. Adjust the timing and reminders, then choose **Save current plan** to reuse those settings later. You can save up to eight named profiles on this device. Camera checks still require permission each session.

On Windows, minimize ScreenWell to keep its taskbar countdown visible. The badge shows remaining minutes, and hovering over the ScreenWell icon in the notification area shows the exact time and next action. The taskbar progress bar follows your current study block, break, or timed focus session.

In **Your progress**, Study & focus time shows logged minutes by day for today or the last seven days. Expand **View the report as a table** to read the daily values.

With camera checks active in a guided session, ScreenWell logs sustained time out of view. After returning from a scheduled rest, choose **Count as a break** or **Dismiss**. Camera capture continues in dim light, and the live camera panel explains when tracking needs a clearer view. Session summaries and Progress show the logged time out of view.

Eye-break reminders now include **Start eye exercises**, which opens the animated **Eye Rest** section and starts a six-step routine. Stretch reminders use **Do it now** to restore the app and start the stretch routine. Both have timed instructions, pause/skip/close controls and optional voice. Starting exercises pauses an active study plan and stops its camera until the user explicitly resumes.

The dashboard now puts guided sessions and calibration first, shows live camera readings, and follows the active session countdown. Movement popups include immediately usable steps. Blink detection rejects tracking gaps and threshold jitter; posture smoothing keeps world and image coordinates separate. These reliability fixes are not a measured accuracy guarantee. Distance remains relative to your comfortable calibrated position.

Closing the window keeps timers running in the system tray and stops the camera. To exit completely, right-click the tray icon and choose **Quit ScreenWell**. Start-with-Windows is an explicit preference and is applied only by a packaged app.

Posture alerts now require a calibrated score below **80** for the selected sustained duration; recovery to 80 clears them. Eye and stretch reminders each include six optional illustrated choices. Enable **Offline voice guidance** in Settings and save, or use **Enable voice guidance** on a reminder. Replay, stop and exercise narration controls use only an installed offline English Windows voice. Without one, written instructions remain available. See [guidance sources and scope](WELLNESS-GUIDANCE.md).

## Develop and build

Use Windows x64 with Node.js 24 LTS or newer and npm. Internet is needed for developer dependency and asset acquisition, not for the resulting app.

For a signed Windows release, use a code-signing certificate from a provider in the Microsoft Trusted Root Program. The certificate and private key must be available in the build user’s Windows Personal store. Set `SCREENWELL_SIGN_CERT_SHA1` to its thumbprint, `SCREENWELL_SIGNTOOL` to the full Windows SDK SignTool path, and `SCREENWELL_MAKENSIS` to the NSIS 3.12 or later compiler. Run `npm run dist:setup:signed`. This command signs and verifies the runtime binaries, uninstaller, and final setup. [Microsoft signing guidance](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options) · [NSIS compiler release notes](https://nsis.sourceforge.io/Docs/AppendixF.html)

```powershell
cd D:\pROJECT
npm ci
npm run assets
npm run dev
```

`assets` bundles a pinned Face Landmarker and Lite/Full/Heavy Pose Landmarker models, the WASM runtime, fonts, a locally generated icon, and a synthesised chime. `dev` serves the built app from a local secure protocol. Re-run it after source changes.

```powershell
npm test
npm run lint
npm run test:ui
npm run dist
```

`npm run dist:setup` builds the versioned Windows installer, checks the archive with 7-Zip, and compares the extracted files with the packaged app. On the build PC, install 7-Zip or point `SCREENWELL_7ZIP` at its executable. Someone installing ScreenWell only needs the setup file. `npm run dist` also builds a portable executable. Use `npm run dist:portable` for the portable target alone or `npm run dist:dir` for an unpacked build. Prepare the assets before the first build. The lockfile pins resolved dependencies. SQLite is built into Electron's Node runtime.

## What is implemented

- Background study monitoring after minimization, native Windows notification requests and independent desktop popups above ordinary apps. Confirmed Windows notification blocks and native errors show a fallback message; unknown delivery is labelled honestly. The app does not change notification preferences or bypass the lock screen, secure desktop or exclusive fullscreen restrictions.
- Fresh camera-alert readouts: signal confidence, posture score/position, observed blink count and relative screen distance. Confidence is a transparent quality estimate rather than an accuracy claim. Optional session distance calibration enables a ten-second proximity alert; distance is relative to the calibrated position, not centimetres.
- Guided study sessions open first: choose planned study hours, review 20-minute study blocks and 30-second look-away rests, then start. Study time excludes added rests and exercise. Water reminders follow rests, and exercise reminders can run every 30, 60 or 90 study minutes or be disabled.
- Optional, independent session blink and posture checks, session-only camera consent and calibration, live blink totals, 20/25/30-second sustained posture alerts, recalibration, illustrated exercise guides and limited upper-body movement cues. Neither option keeps the camera off. Exercise/repetition verification is not claimed.
- Main-process session timers, pause/resume, camera-free fallback, saved recovery, partial-time summaries and animated themed reminders. Sleep/clock changes pause the session; reopening keeps it paused with camera off. Alerts and statistics pause during scheduled rests and exercise. Session choices do not change global camera preferences.
- Onboarding, required name, optional profile, greeting, nine colourful palettes, custom colour pairs, polished light/dark/Windows modes, motion controls, tray, login preference, edit/export/delete controls.
- Main-process scheduler for breaks, water, stretches, eye rests, and posture; 5/10/15-minute snooze, skip, off-for-today, quiet hours, Pomodoro, 20-20-20, custom timing, and timed/indefinite Important task mode.
- Repeated-skip suggestions ask before changing intervals. Reminders wait briefly during typing inside ScreenWell. Background pop-ups use `showInactive()` and never lock the screen.
- Water logging, editable targets and active hours, local history, animated glass, and hydration streaks.
- Optional camera: local Face and selectable Lite/Full/Heavy Pose Landmarker, classic web worker, model-dependent 5–8 FPS processing, in-memory image transfers, EAR blinks, eye calibration, stable personal posture/distance calibration, sustained prompts and cooldowns, preview controls, immediate off and consent revocation.
- Sixteen SVG/CSS exercise guides; 2/3/5-minute rule-selected routines, pause/close/skip, written instructions, installed offline voice support, and simple optional baseline cues.
- Real daily/weekly charts, accessible report table, transparent habit-score formula, local rule insights, gentle badges, and PDF/CSV export with local fonts.
- Illustrated desk guide, relative camera-distance cue, high contrast, larger fonts, reduced motion, labels and keyboard controls, modal focus containment, local feedback, research traceability, and isolated labelled demo mode.

## Your daily workspace

The dashboard combines a live focus timer, daily priorities, completed focus minutes, logged water, weekly activity and your actual upcoming reminders. Start 25-, 45- or 60-minute focus mode from the hero; all reminders pause until the session ends or you choose Finish focus.

Add up to five priorities for today and choose a focus goal. Tasks and completion are saved locally, survive reopening, and stay separate from demo mode. Each local day starts with a fresh list; the focus goal carries forward.

Press **Ctrl+K** to search pages and quick actions. Use arrow keys and Enter, or Escape to return. The breathing reset offers one or two quiet minutes with pause/resume; completed sessions are logged locally and incomplete sessions are not counted. Reduced motion keeps the circle still.

## Colours and motion

Open **Settings → Appearance studio** to preview nine palettes or enter your own primary and companion colours. Choose **Apply appearance** to save the combination across the app and reminder windows. Text colours adapt for readability.

Choose **Still**, **Gentle** or **Expressive** motion and optionally turn off ambient colour glows. Windows and app reduced-motion preferences always take priority. Decorative artwork pauses in the background while reminder timers and camera monitoring continue.

## Structure

```text
main/        Electron lifecycle, IPC, tray, permissions, local protocol, exports
renderer/    React UI, local illustrations, exercises, accessibility
engine/      Pure deterministic reminder scheduler
vision/      Pure blink/posture geometry, thresholds, inference worker
data/        SQLite, summaries, PDF/CSV, isolated demo data
shared/      Strict IPC contracts and defaults
assets/      Bundled models, WASM, fonts, icon, and sound
scripts/     Build, asset preparation, and offline validation
tests/       Unit and actual Electron UI checks
release/     Windows setup, verification records, and project previews
```

The renderer has no Node access. The sandboxed preload exposes narrowly scoped IPC methods. Main validates input and sender origin. The secure local `screenwell://app` protocol serves only bundled assets. The session rejects remote requests; CSP blocks remote sources. The build also scans runtime load sites for remote URLs.

## Camera limits to explain to your mentor

This is a calibrated wellness prototype, not a clinical instrument. Webcam depth is only a proxy for forward-head movement. Face size estimates distance relative to a baseline, not centimetres. Lighting, glasses, occlusion, camera position, frame sampling, and model errors affect results. At 5–8 FPS, short blinks can be missed. A full observed minute is required before showing a blink rate; loss of a clear face resets that window. Posture needs visible shoulders; distance tracking needs only a clear face. Keep one person in view for calibration. See [version 1.1 changes and calibration instructions](CHANGELOG.md).

Calibration stores only numerical EAR threshold and posture geometry. Move or tilt the camera? Recalibrate. No personal threshold learning runs silently. Settings in `vision/config.ts` explain the tunable heuristics.

## Demo

Open **Privacy & purpose → Mentor demo → Enter labelled demo mode**. This switches to a separate in-memory database with sample activity. A visible banner remains throughout the app; exports label the dataset. Use the preview buttons to demonstrate snooze/skip immediately. Leaving demo restores personal history. See [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Validation and remaining release checks

Automated evidence and limits are recorded in [VALIDATION.md](VALIDATION.md). The unit suite covers geometry, blink transitions, sustained alerts, focus/quiet/snooze scheduling, streaks, score calculation, CSV safety, SQLite persistence/deletion, demo separation, and PDF generation. Electron tests cover onboarding/restart, focus, exercises, water, local model loading with a synthetic camera, export files, demo actions, blocked external requests, simulated offline operation, accessibility preferences, and deletion.

Before claiming production readiness, complete physical-camera accuracy sessions with consenting users, clean Windows 10 and 11 installer/portable tests with Wi-Fi off, and CPU/memory/battery measurements on a representative laptop. These require real hardware or clean virtual machines and are not replaced by a synthetic-camera test. Optional cross-app full-screen detection, global typing observation, automatic personal learning, additional languages are not included. Important task mode provides explicit control during exams and calls.

## Project notes

See [DECISIONS.md](DECISIONS.md), [PRIVACY.md](PRIVACY.md), [TRACEABILITY.md](TRACEABILITY.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
