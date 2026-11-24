# ScreenWell changelog

## 1.14.0 — Windows taskbar countdown and release fixes

- Minimize a session to see its remaining minutes on the taskbar. Hover over the tray icon for the exact countdown. Pausing a session freezes its timer.
- The dashboard uses larger timer controls and reminder text. Its reminder queue follows quiet hours and puts the active reminder first.
- A delayed click on an older reminder can no longer dismiss its replacement. Setup recognizes a running installation even when its title changes and assigns the app's Windows identity to its shortcuts.

## 1.13.0 — Dashboard theme refresh

- Reworked the Overview focus timer with layered glass-ribbon artwork, a clearer countdown, and a progress ring.
- Applied the selected color palette to the dashboard surfaces and navigation states. The timer artwork respects the ambient graphics and high-contrast preferences, and the ring respects reduced motion.

## 1.12.0 — Step-away logging and break confirmation

- Guided study records sustained time out of camera view when session camera checks are active. The session and Progress page show the observed duration.
- When time out of view overlaps a scheduled rest, review it in the session or reminder. Choose **Count as a break** to save break credit or **Dismiss** to leave the plan as scheduled.
- Camera checks explain low-light, missing-face, and interrupted readings while capture continues. Alerts start a new countdown after tracking settles.

## 1.11.1 — Report consistency and history reliability

8 November 2026.

- PDF reports show the total completed focus minutes for each day, matching Your progress.
- Large focus histories no longer risk exceeding JavaScript's function argument limit when calculating the longest block.
- Regression checks cover multiple focus blocks in PDF output and 150,000 focus history records.

## 1.11.0 — Focus activity and reminder polish

4 November 2026.

- See logged study and focus minutes by day, with a total and active-day count in Your progress.
- Reminder actions stay in view while long instructions scroll, including in desktop popups.
- Progress shows an empty wellness score on days with only study activity. All six eye exercises now count toward the eye exercise milestone.
- Report export controls pause while a save dialog is open.
- Added an explicit Windows release command that requires a trusted signing certificate and verifies signatures on the installer and its executables. A signed release still requires the publisher’s credentials.

## 1.10.0 — Study Profiles

4 November 2026.

- Load Quick Review, Balanced Study, or Practice Exam in the study planner and review the timed schedule before starting.
- Adjust study blocks and breaks, then save up to eight named profiles on the device. Saved profiles survive an app restart.
- Profiles remember which camera checks you selected. Loading any profile requires fresh camera permission before capture can begin.

## 1.9.0 — Eye Rest and direct exercise handoff

3 November 2026.

- Added an Eye Rest section with six animated exercise choices, a guided routine and written instructions.
- Eye reminders use Start eye exercises; stretch reminders use Do it now. Both restore the main app and immediately start the matching guided routine, including during study sessions.
- Starting exercises pauses an active study plan and stops its camera. The plan remains paused until explicitly resumed, preventing a short rest timer from restarting study during a longer routine.
- Timed guidance, pause/skip/close controls, voice and reduced-motion behavior share the existing routine player.
- Added a per-user Windows NSIS installer build that creates its uninstaller during installation. It supplies desktop/Start-menu shortcuts and an Installed apps entry, checks for a running copy and 64-bit Windows, preserves history, and removes only known installed filenames.
- The standard electron-builder NSIS helper was blocked by this host's Code Integrity policy. The direct NSIS build executes the compiler without executing a generated unsigned helper or changing security settings. Native installation/uninstallation validation remains pending.

## 1.8.0 — macOS build preparation (source only)

2 November 2026.

- Added Apple Silicon and Intel DMG/ZIP targets, a Mac icon, camera-use description and camera/JIT entitlements.
- Added native application/edit/window menus, Dock reopen behavior, a smaller menu-bar tray icon and Command-K labelling. Voice, privacy, notification and permission text adapt to macOS.
- Windows notification-setting queries remain Windows-only. macOS reports unknown native delivery rather than claiming permission is granted or blocked.
- Added a Mac build script, manual GitHub Actions workflow, package/signature/architecture verifier and isolated camera-free packaged launch check.
- This Windows host cannot produce macOS packages with electron-builder. No Mac DMG, ZIP app or successful Mac runtime validation is claimed. The separately labelled Mac BuildKit ZIP contains source and assets, not an installable app. The last Windows executable remains version 1.7.

## 1.7.0 — Score-based coaching, exercise choices and spoken reminders

2 November 2026.

- Posture alerts require a reliable calibrated score strictly below 80 for the selected hold time. A score of 80 or above resets evidence and clears an active posture alert. Quality, consent, snooze and cooldown gates remain in effect.
- Eye and stretch reminders each offer six selectable illustrated choices, with full written steps inside foreground and background popups. Each choice is optional; routines are not required to fit inside a short look-away timer.
- Optional offline speech reads delivered reminders, including posture and proximity prompts. A single renderer owns speech to avoid duplicate voices from foreground and desktop popups.
- Added enable/mute, replay, stop, exercise narration and a Settings voice test. Local English voice availability is handled asynchronously; remote voices are never selected. Pausing a guided routine or disabling voice stops its narration.
- Expanded background reminder height within the display work area, retaining scrolling and dismissal on smaller screens. Guidance sources and limits are documented in WELLNESS-GUIDANCE.md.
- Fixed tall foreground reminders extending above the viewport; cards now scroll and retain a reachable close control. Desktop reminder delivery also handles Windows reporting a minimized window as focused.

## 1.6.0 — Clearer dashboard and more dependable readings

2 November 2026.

- Added a prominent guided-session entry, direct calibration access and live monitoring on the dashboard. The main countdown follows an active guided session instead of an unrelated reminder.
- Added blink rate with an observation warm-up message, proximity countdown and actionable tracking/calibration guidance. All additions follow the chosen light/dark palette and reduced-motion preferences.
- Blink counting requires an observed open–closed–open cycle and a distinct reopening threshold. Missing frames and reversed timestamps reset rate evidence instead of fabricating a continuous minute.
- Posture measurement rejects low-presence shoulders and resets smoothing when world-space depth becomes unavailable or returns, avoiding mixtures of incompatible coordinates.
- Movement popups include three immediate steps and an illustrated guide. Reminders describe scheduled study time rather than claiming the camera verified uninterrupted sitting.
- Ten-second calibrated proximity alerts, background inference, optional camera consent and notification fallback remain supported. Distance is relative, not centimetres; accuracy still needs real-person validation.

## 1.5.0 — Background monitoring and desktop alerts

1 November 2026.

- Selected session checks keep processing when minimized. A live status panel explains background operation, pause/end controls, and camera-off behavior when closing to tray.
- Added native Windows notification requests plus an independent, dismissible ScreenWell popup above normal desktop windows. Popups use the display nearest the pointer, stay inside its work area and do not take focus. Windows notification errors or confirmed blocks leave the popup available.
- A read-only, bounded Windows status query distinguishes actual application/user/policy/manifest blocks from unknown delivery status. It never changes Windows notification settings. Unsupported native notifications and silent banner suppression still leave ScreenWell popups visible.
- Camera alerts show fresh signal-confidence estimates, posture score and position, observed blinks, and calibrated relative distance. Confidence is a lighting/framing/landmark heuristic, not validated accuracy. Stale or unclear readings are withheld; no centimetre estimate is invented.
- Added optional per-session screen-distance calibration and ten-second proximity alerts. Blink, posture and distance checks can be chosen independently. Old saved sessions keep distance disabled unless selected.
- Live numeric readings travel over a small in-memory update channel once a second. They do not reload the history database or save video, landmarks or confidence readings.
- Busy camera startup retries once after a short delay, only while the same camera request remains authorized. Stop or consent withdrawal cancels that retry; older capture-ended callbacks cannot stop a newer connection.

## 1.4.0 — Guided study sessions

1 November 2026.

- The app opens on a study-session planner. Choose one, two, three or custom hours, review study and total time separately, then start. The plan alternates 20-minute study blocks with 30-second look-away rests by default; rest duration and 30/60/90-minute exercise timing are configurable.
- Blink counts and posture checks are independent, optional session choices. Selected checks start with explicit session consent and calibration; neither keeps the camera off. Unselected features are disabled in both the worker and main process. Blink-only sessions do not initialize the pose model. Session calibration stays separate from general settings.
- Posture prompts wait 20, 25 or 30 continuous seconds of reliable evidence. Recovery and unclear views reset the delay. Camera alerts pause during rests and exercises; session blink totals and posture summaries cover study time only.
- Animated look-away, water, exercise and completion reminders use the active colour theme and respect reduced motion. Water follows look-away rests; exercise guides show gentle illustrated movements. Optional upper-body movement cues do not claim to verify exercises or repetitions.
- Visible background notifications animate without requiring focus. Hidden notification windows pause artwork, and system reduced-motion preferences override it.
- Main-process timing, pause/resume, camera-free fallback, partial-study totals and completion summaries. Sleep or clock changes pause the plan; reopening a saved session keeps it paused and the camera off. Old water messages coalesce instead of piling up. Existing off-for-today choices still apply.
- All session data remains local. No runtime downloads, recording, upload, account or service was added.

## 1.3.0 — Lumen workspace

1 November 2026.

- Redesigned the dashboard around a live focus dial, clearer daily activity cards, a weekly activity view, upcoming reminders and quick actions. Numbers come from actual logs and scheduler state.
- Added Cobalt, Nebula and Sakura to the six existing colour stories. Light, dark, Windows mode and custom colour pairs work across the new screens. Improved typography, spacing, surfaces, focus states and modal presentation.
- Start a 25-, 45- or 60-minute focus session directly from the dashboard. The dial shows the real remaining time. Quiet hours, disabled reminders and focus mode are reflected in the upcoming queue.
- Add up to five daily priorities, check or remove them, and choose a personal focus goal. Priorities are scoped to the local day and saved in SQLite. Yesterday is preserved, each new day starts empty, and the chosen focus goal carries forward. Demo priorities remain separate. Delete-all-data removes planner state too.
- Press Ctrl+K to find pages and actions with search, arrow keys and Enter. The menu supports Escape, focus restoration and a contained Tab sequence. Opening camera controls still requires explicit camera consent and Start camera.
- Added one- and two-minute breathing resets with a visual guide, pause/resume, restart and completion logging. Early exits do not count as completed sessions. Reduced motion leaves the breathing circle still while instructions and timing continue.
- Dialogs lock background scrolling and preserve scroll-lock state when more than one dialog is open. Decorative loops pause in inactive windows.
- All features remain local, with no new runtime downloads, service dependencies or accounts. Physical-camera accuracy and measured laptop performance still require real-hardware evaluation.

## 1.2.0

### Colour and motion

Open **Settings → Appearance studio**. Choose Light, Dark or Windows mode, then pick Aurora, Lagoon, Sunset, Orchid, Citrus or Forest. Use the primary and companion colour pickers or six-digit hex fields to make your own combination. The live preview stays local until **Apply appearance**.

- Shared palette colours now reach navigation, cards, progress charts, water, exercise and desk illustrations, and reminder pop-ups. Native Windows chrome follows the selected colour mode.
- Dark mode uses ink backgrounds, tinted raised surfaces, clear text and restrained colour glows. Foreground colours adapt across generated surfaces; button labels choose a readable light or dark colour.
- The dashboard adds an SVG orbit scene, floating tags, slow leaf motion, and optional accent particles. Page and modal entrances, hover states and a small water-log celebration add feedback.
- Still, Gentle and Expressive motion levels are saved locally. App and Windows reduced motion override them. Ambient glows can be turned off; high contrast suppresses them.
- Decorative animation pauses when the native window is hidden or loses focus. Monitoring, reminders and guided timers continue independently.
- Older profiles receive appearance defaults without losing their saved light/dark preference or history. Appearance saves preserve camera calibration and other preferences. Profile, water and reminder forms also preserve changes made using the top-bar theme button.

### Verification and packaging

The new checks cover foreground contrast across generated surfaces, button contrast through a sampled RGB cube, settings migration, preview isolation, custom colours, native mode, saved preferences, reduced motion, background artwork pausing and reminder-window colours. All models, artwork, fonts and runtime resources remain local. Version 1.2 is provided as a portable build; the existing managed-host installer and executable-signing limitations below still apply.

## 1.1.0

### Use the new distance reminder

1. Open **Camera**, consent if needed, and start the camera.
2. Sit at a comfortable screen distance. Choose **Calibrate comfortable posture** with both shoulders visible, or **Calibrate screen distance** with only your face visible. Hold still for four seconds.
3. The default reminder waits for **10 continuous seconds** of being too close. A brief 2–3 second lean does not alert. Returning to a comfortable distance for two seconds clears an active distance nudge.
4. Adjust the delay (3–30 seconds), face-size trigger (default 125% of calibration), and distance cooldown (default 60 seconds) in Camera preferences.
5. Use snooze, skip, off-for-today, Focus mode, and quiet hours as before. Snooze now suppresses camera-origin reminders too.

The distance meter reports an approximate position relative to your own baseline. It does not measure centimetres, determine whether you are reading, or perform eye-gaze tracking.

### Posture and tracking improvements

- Full is the new default pose model. Heavy provides the most detailed bundled model, with more processing cost. Lite remains available. Turn the camera off to change models, then recalibrate posture.
- Head orientation comes from the face transformation matrix. Posture uses ear position relative to shoulders in world coordinates, scale-normalised neck length, shoulder slope, tilt, and leaning.
- Face-only proximity combines eye span, face height and face scale. Shoulder visibility is not required for distance alerts.
- Median filtering, temporal smoothing and separate enter/release thresholds reduce single-frame spikes and flicker. Blink samples remain unsmoothed.
- Clipped faces, large turns, multiple people, tracking gaps, and unusable lighting pause uncertain estimates and alert evidence.
- Four-second calibration rejects unstable or incomplete views. Calibrations record the geometry version and pose model. Legacy posture geometry is cleared on upgrade while the profile and history are preserved.
- Capture continues at its intended cadence when minimised or another app is active. Closing to tray still stops the camera. A stalled worker stops safely and offers restart.
- Fast stop/start and model switches are guarded against stale stop acknowledgements. Starting waits for a model preference save to finish, and camera startup has a timeout.
- Calibration saves use a dedicated numeric-only update. A late calibration save cannot re-enable revoked camera consent or overwrite unrelated preferences.
- The camera page adds tracking quality, processing time, relative distance, an approaching-alert countdown, and calibration feedback. The desk guide uses the same distance state.

All four model files, WASM, fonts and illustrations remain bundled. Frames and brightness samples stay in memory. Only numerical calibration and the existing numerical summaries/alert events are stored.

### Accuracy and release validation

These changes improve the measurement approach and offer more detailed models. No percentage accuracy claim is made. Synthetic landmarks and a synthetic camera test filtering, timings, asset loading and controls; physical-user accuracy across lighting, glasses and camera positions still requires evaluation. Heavy may use more CPU, and lower sampling rates can miss quick blinks.

The managed host blocks unsigned executables through Device Guard. During version 1.1 packaging it also blocked the NSIS build's generated setup helper, so the installer refresh is incomplete. The portable target is built separately. Incomplete setup files are isolated in `release/incomplete`. No security policy or signing trust is changed. An approved signing/build environment is needed to finish the installer and validate native launch on this managed host.

Upstream references: [Pose models and outputs](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker), [Face landmarks and matrices](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js), [Matrix layout definition](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/framework/formats/matrix_data.proto).
