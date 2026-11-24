# Validation record

## Linux 1.14.0 preview — 24 November 2026

- Ubuntu 24.04 x64 passed the production build, offline asset check, lint, and all 118 unit tests.
- The `.deb` installed and uninstalled on Ubuntu. Its desktop entry and 25 packaged application files, including four offline camera models, matched the build. The extracted AppImage contained the same app archive.
- Both packages launched, finished onboarding offline, ran a study session, logged water, exported a PDF, and displayed light and dark dashboards at a compact window size with 130% text.
- With the installed `.deb` and a synthetic feed, camera inference continued while minimized and stopped when the session paused. The virtual desktop used software graphics for this test. Hands-on webcam testing, other Linux desktops, and the AppImage's mounted launch remain open. [Successful Ubuntu run](https://github.com/Tech-Adii/ScreenWell/actions/runs/45415738046)

## Windows 1.14.0 — 24 November 2026

- Type checking, the offline asset scan, lint and all 118 unit tests passed. All 22 Electron desktop scenarios passed together on the final build. An earlier run timed out while dismissing a popup and capturing a screenshot. Both scenarios passed in the final full run.
- The desktop suite covered guided study, eye and stretch exercises, water, offline voice control, reminder dismissal, quiet hours, minimized tracking, the Windows taskbar timer, camera permission and calibration flows, dim light, returning from a break, and local reports. Camera scenarios used test video and synthetic readings. They do not measure accuracy on physical webcams.
- The Windows installer archive passed integrity verification. All 25 compiled application files matched the packaged app, including its four offline camera models. All 72 runtime files matched both the extracted setup and the installed copy.
- On Windows 11 x64, setup registered both launch shortcuts with the correct Windows app identity. Setup detected an in-use executable before overwriting files. Uninstall removed the test installation, shortcuts and registration.
- An in-place upgrade from 1.13.0 to 1.14.0 reused the registered install location and preserved the test user's name, dark theme, water log and daily priority. The upgraded app reopened with the camera off.
- The installed executable opened its own temporary profile, completed onboarding offline, started a guided session with its taskbar countdown, logged water, and exported a local PDF. Its dashboard fit a compact window in light and dark mode with text at 130%. Windows 10 and physical webcam accuracy were not tested in this release. The installer is unsigned.

## Version 1.13.0 theme checks

- Production build, offline asset check, lint, and 112 unit tests passed. Both targeted Electron UI tests passed, covering appearance preferences, decoding the bundled artwork, and the dashboard workflow at standard and compact widths.
- An isolated preview run captured the main screens and found no page errors or horizontal overflow across the audited pages. The refreshed focus panel and light dashboard were visually reviewed. The artwork is a local 38 KB WebP.
- Windows setup passed archive integrity and extraction checks. All 72 runtime files matched the stage. The installer remains unsigned. Native installation and uninstallation remain untested.

## Version 1.12.0 step-away checks — 19 November 2026

- The TypeScript production build, offline asset scan, lint, 112 unit tests, and all 21 Electron UI tests passed. The full desktop run took 7.3 minutes.
- The step-away scenario checked that unclear lighting leaves the camera on, time out of view persists in SQLite, and a scheduled rest receives credit only after confirmation. It also checked that tracking resumes after a steady view returns.
- The real offline face model processed a dim synthetic video stream and reported a lighting interruption while capture continued. Other tests verified that the camera worker runs minimized, that signal gaps do not count as time away, and that alerts begin a fresh countdown after an interruption. Physical webcams were not retested for this version.
- The Windows installer passed archive integrity and extraction checks. All 72 runtime files matched the staged app. Setup is unsigned and native installation and uninstallation were not tested. SHA-256 `7f58c31e347a0689941162d6be4dd165203c999137c929df4b69fcf1b0d7b24a`.

## Version 1.11.1 checks — 8 November 2026

- Production TypeScript compilation, offline asset scan, ESLint and 108 unit tests passed. New regressions check daily PDF totals across multiple focus blocks and summaries of 150,000 focus records.
- The full desktop UI run passed 18 of 20 scenarios. Heavy model startup and a popup dismissal timed out while release packaging overlapped the run. After packaging finished, the unchanged camera, coaching and application/export scenarios all passed together in 54 seconds. All 20 scenarios passed across these runs. The initial failures' cause is not established.
- All 24 compiled runtime files and four offline models match the packaged application. The installer passed archive integrity and extraction checks with all 72 runtime files matching. Setup size is 156,857,554 bytes, SHA-256 `71e018f2e7f57191dfc0d900bcea395afdf6880cf569ca030f9aec145031c7ef`.
- Setup remains unsigned. Native installation/uninstallation, physical camera accuracy and audible system speech remain unverified. Camera checks use a synthetic video stream with the real bundled models. Speech routing is tested with a mocked speech engine.

Updated 4 November 2026 on the Windows x64 development machine using Electron 45.2.1.

## Version 1.11 checks

- The TypeScript production build, offline asset scan, lint, all 106 unit tests and all 20 Electron UI tests passed. The final UI run took 4.8 minutes.
- The reminder actions fit inside the desktop popup with a long eye exercise guide. Progress tests cover completed focus totals, study-only records, zero-valued camera estimates and milestone credit for all six eye exercises.
- The camera UI tests now supply a deterministic video track after Chromium's synthetic device intermittently failed on this host. They still run the bundled offline models and verify inference while minimized, pause and consent withdrawal. Physical camera behavior remains untested.
- Captured the main screens in an isolated demo profile. Ten pages passed the horizontal overflow and page-error checks. The Progress preview also exercised the period filter and dark mode.
- The Windows setup passed archive integrity and extraction checks. All 72 runtime files match the staged package, including the ASAR with all four models. `ScreenWell-1.11.0-Setup.exe` is 156,975,189 bytes with SHA-256 `257ad27b5148698b0b69d849f96f8c681f944dc62d6e67b8e0d12feaffddd966`. Setup is unsigned. Native installation, uninstallation and packaged UI remain untested for this version.
- The signed release preflight rejects missing signing credentials. This host lacks a trusted signing identity and the required NSIS compiler, so an end-to-end signed release was unavailable. Windows security settings were left intact.

## Version 1.10 checks

- The TypeScript production build, offline asset scan, lint and 104 unit tests passed.
- Four Electron UI tests passed, covering the existing study wizard, camera permission boundaries, and loading, saving, reopening and removing a profile. The new test verifies the schedule preview, that loading a profile clears consent even during setup, and that the selected checks survive an app restart without camera permission.
- The Windows setup archive passed extraction and integrity checks. All 72 runtime files match the staged package, including the four models in ASAR. The setup file is unsigned. Native installation and uninstallation remain untested for this version.
- `ScreenWell-1.10.0-Setup.exe` is 156,913,719 bytes with SHA-256 `477989c78884f7d95efe2eca240f2cb9c595ff3edc13ea073ffc53d14218e8ee`.

## Version 1.9 checks

Final installer: `ScreenWell-1.9.0-Setup.exe`, 156,838,965 bytes. SHA-256: `4d3edc71f4f02b27077f022a1981025b3f592a953bdacc24f7d6c0355fc58f0a`. The full 7-Zip archive integrity check passed; all 72 extracted runtime files match the staged package byte for byte, including the ASAR containing all four models. The app PE is x64 and setup reports file version 1.9.0. Native install/uninstall remains untested.

- Strict TypeScript, production/offline build, lint and 104 unit tests pass. The new Eye Rest preview was rendered and visually inspected.
- Three new UI cases pass: foreground eye reminder opens Eye Rest and starts its animated routine; a minimized stretch popup restores the app and starts stretches; and both session rest/exercise notices pause the study plan, keep the camera off and open the correct guide. The foreground test also checks reduced motion, pause/continue and skipping a step.
- Existing camera-free study transitions, water reminders and exercise guidance passed. The six-choice voice UI regression passed in isolation after a grouped run encountered a second scheduled demo break and a later pointer-delivery timeout while installer compression was running. Its fixture now disables the unrelated demo break. Five distinct source UI scenarios were verified across runs, not a single clean grouped run. Audio remains mocked in the speech-routing test.
- All 24 compiled runtime files and four models match the unpacked ASAR; no external node_modules is required.
- Standard electron-builder NSIS generation was rejected when executing its generated helper. Code Integrity events 3077/3033 identified the Enterprise signing requirement. The incomplete helper is isolated under release/incomplete. The direct NSIS build uses the normal compile/install-time WriteUninstaller flow, without executing an unsigned helper on the build host or altering OS policy.
- Setup is unsigned. Native installation/uninstallation, packaged UI and clean-PC tests have not been claimed as passed. The final archive inspection and hashes are recorded separately in release/INSTALLER-VALIDATION.json.

Installer build references: NSIS [WriteUninstaller](https://nsis.sourceforge.io/Reference/WriteUninstaller) and [user execution level](https://nsis.sourceforge.io/Reference/RequestExecutionLevel). Rebuild with `npm run dist:setup`; the build uses the cached NSIS compiler or a compiler path supplied through `SCREENWELL_MAKENSIS`. Archive verification uses installed full 7-Zip or `SCREENWELL_7ZIP` and does not execute Setup.

## Version 1.8 macOS preparation

Source includes Mac packaging targets, camera-use metadata/entitlements, menus, Dock reopening and OS-specific wording. The attempted command `electron-builder --mac zip --arm64 --x64 --publish never` failed immediately with: “Build for macOS is supported only on macOS.” No Mac executable or installer was generated, and no Mac runtime/camera/audio tests have run.

On Windows, strict TypeScript, production/offline build, lint, 104 unit tests and two UI regressions (appearance and inactive desktop popup) pass. Mac-specific notification wording is unit tested. The camera-only entitlement plist, camera usage description, ICNS container, shell LF line endings and JavaScript script syntax were checked. These checks do not replace a native macOS build or launch test.

The Mac build kit includes only source, tests, public assets and build documentation; it excludes node_modules, release artifacts, local databases and test results. Its ZIP and hash are checked separately in `release/MAC-BUILDKIT-VALIDATION.json`. It is explicitly not a runnable Mac app. The Mac-only verifier and packaged smoke test are supplied for execution on a Mac or the manually dispatched macOS workflow; those checks are not marked passed here.

## Version 1.7 checks

Final portable: `ScreenWell-1.7.0-Portable.exe`, 154,248,191 bytes. SHA-256: `cf3fbf9d9fc19a7081242b251a9c9064aaf78be7572932be3b5a82ded981c7f9`. All 24 compiled runtime files match the final ASAR; four models are bundled with no external node_modules. Packaged native UI verification remains false.

- Strict TypeScript, production/offline build, ESLint and all 103 unit tests across thirteen files pass. New coverage checks the strict below-80 boundary, dwell/reset behavior independent of issue labels, six distinct exercise choices, local-only voice selection, asynchronous voice discovery, cancellation and unavailable voices.
- The final four-case targeted UI run passed in 52.1 seconds: real offline worker inference while minimized and stop on pause; live background distance alerts; six-choice eye/stretch guides with voice enable/mute/replay/stop and single-renderer narration routing; and desktop popup focus/dismissal behavior.
- Speech UI tests replace the browser speech engine with a mock to assert messages and cancellation without playing sound. Actual audible Windows voice playback remains unverified. Only voices marked local and English are eligible; there is no remote fallback.
- During development, the test's initial voice mock was rejected by the native utterance voice setter; the fixture now mocks the utterance as well. Testing also exposed a real tall-card clipping bug and minimized-window focus misreporting. Foreground cards now scroll with a reachable close button, and desktop delivery checks minimization/visibility in addition to focus. The final passing run includes these fixes. A prior test also incorrectly waited for a new popup rather than checking the existing surface.
- The eye-guide preview in `release/previews/1.7` was visually inspected. Its card can scroll; the close control remains reachable. Written steps and optional exercise choices do not establish physical-camera accuracy or medical benefit.

## Version 1.6 checks

Final portable: `ScreenWell-1.6.0-Portable.exe`, 154,244,021 bytes. SHA-256: `c33953488d2919612f2019b7d37ad331bb38ae4f02537d865b9576a41155f34b`. Portable packaging completed; packaged UI verification remains false.

- Strict TypeScript, ESLint, production/offline build and all 99 unit tests pass. New regression cases cover blink threshold hysteresis, open-eye arming, missing frames, reversed timestamps, low-presence shoulders and world/image depth transitions.
- Refreshed light and dark dashboards were rendered using an isolated profile and visually inspected. Previews are in `release/previews/1.6`.
- The initial eleven-case targeted UI run hit a test synchronization race: the numeric background-alert test consumed the delayed event for its other desktop window. The test now awaits that window explicitly before waiting for the reminder. A blink-only synthetic-camera case also failed to start capture; isolated reruns are recorded below.
- Version 1.6 package inspection verifies all 24 compiled runtime files byte for byte, all four models, and no external node_modules. Packaged native UI verification remains pending; source tests and ASAR inspection do not establish physical-camera accuracy.
- The initial targeted run passed nine of eleven cases. The corrected background-popup test passed in 53.6 seconds, and the unmodified blink-only camera test passed in 21.2 seconds on isolated rerun. This verifies eleven distinct source UI scenarios across runs, not a clean first full-suite pass: minimized inference/pause, foreground-independent alert delivery, sustained distance and recovery, study planning/consent/recovery, blink-only selection, camera failure, water/exercise guidance, popup sizing/focus and dashboard keyboard flows. Synthetic capture startup remains intermittently unreliable on this host.

## Automated checks

- Version 1.5: 96 unit tests across twelve files pass, along with strict TypeScript, ESLint and the offline asset check. New coverage includes all Windows block states, unknown versus failed native delivery, stale callback cancellation, per-reminder deduplication, scoped/fresh live readouts, inverse relative-distance descriptions, distance-only session calibration, and the signal-confidence formula. Bounded camera retry tests cover transient busy drivers, permission denial, consent withdrawal, second-attempt failure and canceled acquisition.
- The first complete 1.5 UI run passed thirteen scenarios, including all legacy model tests, sessions and accessibility checks, but failed the two new background scenarios. The real-camera scenario observed a synthetic track disconnect before startup completed; it passed in an earlier isolated run. The numeric alert scenario had already passed its topmost/focus/readout assertions before screenshot capture timed out; a rerun's alert expired while the fixture stopped supplying frames. The fixture now supplies continuous numeric frames while checking the popup, with optional screenshot capture bounded separately. The camera check records diagnostics, permits one explicit user-style retry after a disconnect, and checks continuing inference after minimization. Production capture still stops on a real disconnect; a late end event from an older capture generation cannot stop a newer session.
- After the callback guard and continuous fixture update, both new background cases passed in 30.2 seconds, with no retry required in that run. The camera worker continued for an additional five seconds after minimization, fresh readings remained available, pause stopped capture, and the alert remained dismissible without taking focus. This verifies fifteen distinct source UI scenarios across the full run and focused reruns; it is not a claim of a completely clean first full-suite run or physical-camera accuracy.
- A later all-model rerun reproduced the previously observed synthetic `NotReadableError` during camera reacquisition. Startup now retries that specific error once after 500 milliseconds while the same consent and capture generation remain active. Permission denial is not retried, revocation/Stop cancels the retry, and a genuine track disconnect still stops capture. This is not evidence that the host's camera startup variability is fully resolved.
- With the bounded retry included, the all-three-model test passed again in 23.2 seconds, and minimized session inference passed in 16.9 seconds. Native-popup screenshot capture remained intermittent on this host, so screenshot work was removed from the functional alert check; its numeric heartbeat is driven by the test process, keeping renderer visibility and optional artifact capture separate from scheduler validity.
- The final functional background-alert check passed in 12.3 seconds after this fixture separation, including topmost/visibility/focus assertions, fresh numeric readouts, delivery status and actual dismissal through the popup button. Screenshots are previews, not an additional pass/fail condition for this functional case.
- Strict TypeScript production compilation and ESLint.
- 76 passing unit tests across eleven files. The 21 new guided-session cases cover one/two/three/custom-hour plans, exact study totals, 30-minute exercise boundaries, validation and consent, all four optional-check combinations, scoped readiness/settings, pause/resume, camera-free fallback, saved recovery, sleep and clock changes, full delayed rests, water timing, skip/end/partial totals, final completion and continuous 20/25/30-second posture evidence. Existing checks cover vision geometry, scheduling, storage/reports, appearance migration/contrast, reduced motion, daily priorities and breathing.
- Seven Electron UI scenarios: the complete camera-free journey; daily priorities, focus shortcuts, command search and keyboard containment, breathing completion versus early exit, demo isolation, scroll locking and compact layout; custom colours, preview isolation, dark/light/Windows modes, native theme selection, persistence, compact layout, reduced motion, background artwork pausing and theme preservation when saving other forms; all Lite/Full/Heavy models loading offline and continuing while hidden; a real ten-second distance alert plus snooze; automatic distance recovery; and non-focus-stealing background popup dismissal with the selected custom theme.
- The main UI journey reads actual CSV/PDF exports, snoozes/skips demo reminders, verifies demo isolation, rejects an external request, reloads and logs water under simulated offline network conditions, changes contrast/motion preferences, and deletes test data through the actual IPC/native-confirmation path (with confirmation stubbed).
- The first 1.3 full run passed six scenarios and failed capture startup in the camera scenario. An initial isolated rerun also failed with a capture-device error. Capture/playback diagnostics were added to the test, and its next isolated run passed all three models, background inference, consent revocation and stopping. No production camera logic was changed. The intermittent startup failure remains unexplained; this is not evidence of a consistently clean full-suite camera run or a measured real-device accuracy result.
- Version 1.4: all twelve scenarios in the full UI run passed, including all three real bundled pose workers and the new blink-only face worker under simulated offline conditions. After final polish, all six study scenarios passed again: plan/restart recovery; main-process calibration/statistic/alert isolation with numeric fixtures and a real 25-second evidence threshold; blink-only worker initialization with pose disabled; permission denial and camera-free fallback for either/both choices; rest → water → exercise timing using a main-clock fixture; and animated background-popup fit/dismissal without focus stealing. Thirteen distinct UI scenarios are now covered. Synthetic media and numeric fixtures do not validate physical-camera accuracy or exercise/repetition recognition.
- A final notification-motion check found that unfocused popups inherited paused artwork. Visible notification windows now animate without needing focus; hiding them pauses artwork even where Chromium still reports the page visible. System reduced motion still disables it. The appearance, existing background-popup and expanded session-popup scenarios all pass after this fix.
- Build scan rejects direct remote runtime resource loads, verifies pinned model SHA-256 hashes, and requires bundled models, worker, WASM, fonts, icon, and chime.
- Windows block detection uses the read-only [ToastNotifier.Setting API](https://learn.microsoft.com/en-us/uwp/api/windows.ui.notifications.toastnotifier.setting). Native request/failure handling follows [Electron Notification](https://www.electronjs.org/docs/latest/api/notification). The separate topmost window does not prove a native banner was delivered and does not override Windows secure desktop or every exclusive fullscreen application. No user or policy notification setting is changed.
- Production npm dependency audit: no known vulnerabilities at the time checked. Development tool dependencies have separate advisories; no blanket `audit fix --force` was applied.

## Packaged checks

Version 1.5 package inspection confirms the face model and all three pose variants in ASAR, package version 1.5.0, and no external `node_modules` dependency. All 24 compiled runtime files match `dist` byte for byte; `node scripts/verify-package.mjs` reproduces the result in `release/PACKAGE-VALIDATION.json`. Runtime accuracy still needs consent-based physical-camera evaluation. Existing posture calibration is migrated safely by requiring a fresh version-2 baseline while preserving history.

Final 1.5 portable: `ScreenWell-1.5.0-Portable.exe`, 154,243,190 bytes. SHA-256: `95af1e834dc28a677db0cfe7ef4e36fcc343e3a0c68d863075e5e7192ed61d41`. The packaged UI flag remains false; source regression results and package-byte inspection are distinct from native packaged UI and physical-camera validation.

Previous portable: `ScreenWell-1.4.0-Portable.exe`, 154,247,933 bytes. SHA-256: `6b1a17302ffebe068b383177df923df94f2cddc96934d2e47141fdcf738077be`. Current portable hashes are recorded in `release/SHA256SUMS.txt`; hashes identify artifacts and do not certify native UI or camera accuracy.

An intermediate unpacked Windows build was launched using a fresh isolated test profile. Its UI reloaded with network simulation offline, completed onboarding, found both bundled models, started with the camera off, and wrote a real water event to local SQLite. Package inspection confirmed the models/WASM/fonts in ASAR and no external `node_modules` runtime dependency. The icon, product name and version are applied to the executable; code signing is disabled.

The version 1.0 installer and portable build were generated earlier; an intermediate portable build passed offline reload, model presence, camera-off default, onboarding, and SQLite logging. The portable target is built separately. The NSIS installer build did not finish: Windows Code Integrity events 3077 and 3033 recorded the generated setup helper failing the Enterprise signing level requirement on 31 October 2026 at 20:55 local time. The incomplete setup artifact is isolated in `release/incomplete` and is not provided as an installer. An approved build/signing environment is needed to complete NSIS packaging. Portable builds now use versioned filenames; the older running unversioned executable was left intact after it prevented an in-place rebuild.

**Packaged execution limitation:** an earlier 1.1 launch was rejected by Windows Device Guard with exit code 4551 and the message “was blocked by your organization's Device Guard policy.” For 1.2, the process started and exposed debugging endpoints, but both the Electron test driver and a browser-protocol attachment timed out. The 1.3 and 1.4 Electron-driver checks again reached their local debugging endpoints and timed out before UI attachment. The 1.4 check used a fresh isolated profile and ran before portable compression, without a startup error being logged. This is not a completed packaged UI validation; the underlying cause has not been established. Source-based Electron UI tests and byte-for-byte package inspection pass. Final packaged launch, camera and clean-machine checks remain pending. No security policy was disabled or bypassed. Intermediate launch results do not certify the final binary hashes.

Exported PDF pages have been rendered with Poppler and visually inspected. The normal seven-day camera-free report fits one page. Synthetic test records are confined to test profiles and labelled demo mode.

## Acceptance checklist

- [x] First run onboarding and named greetings on later runs.
- [x] Camera-free reminders, focus, hydration, exercises, and reports.
- [x] Local camera model loading, numerical processing, calibration implementation, and on/off controls.
- [x] Pure math and cooldown tests; synthetic-camera integration check.
- [x] Snooze, skip, off-for-today, quiet hours, timed/indefinite focus, and non-focus-stealing background reminders.
- [x] Local exercise animations, timers, and guide controls.
- [x] Real progress charts and local PDF/CSV files.
- [x] Runtime remote-request rejection and simulated offline operation.
- [x] No image/video files created in synthetic-camera test data.
- [x] Updated portable artifact generated; all four models bundled.
- [x] Windows 1.14.0 setup built and installed on Windows 11 x64.
- [x] The installed 1.14.0 executable passed its desktop checks on Windows 11 x64.
- [ ] Physical camera calibration/accuracy testing with consenting users across glasses, lighting and camera positions.
- [ ] Clean Windows 10 and Windows 11 install/uninstall and portable tests with Wi-Fi physically off.
- [ ] Sustained CPU, private memory, and battery benchmarking on a representative laptop; the 3% / 15% CPU targets are not claimed as measured acceptance results.
- [ ] Code signing for public distribution (requires a certificate).

Additional languages, automatic cross-app full-screen detection and personal threshold learning remain optional enhancements. Guided study planning is included in version 1.4. A small English message catalog and separated exercise content are provided; a full second-language translation pass is still needed before adding another locale.
