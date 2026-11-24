# ScreenWell privacy

ScreenWell is a local, offline application. There is no account, analytics, telemetry, cloud processing, remote font, CDN, advertisement, or auto-update request. Developer dependency/model downloads happen before packaging.

## Stored locally

The SQLite database is `screenwell.sqlite` inside Electron's ScreenWell user-data directory under the current Windows user's AppData. Its exact location is shown in **Privacy & purpose**. It stores:

- Name and optional profile answers, reminder/accessibility preferences, explicit camera consent, numerical calibration, scheduler deadlines and focus state.
- Timestamped water logs, reminder choices, completed breaks/exercises/focus sessions, breathing-session completions and posture check-ins.
- Numerical blink-rate and posture summaries, at most every 15 seconds while a clear face is observed.
- Daily priority text, completion and personal focus goals, scoped to each local day. Command-menu queries are not saved or transmitted.
- Saved study profile names, study and break timing, reminder preferences and selected camera checks. Each session asks for fresh camera permission. Deleting all app data also removes saved study profiles.
- User-written feedback, saved locally for the next design-thinking cycle.
- The latest guided study plan, selected camera checks, session-only numeric calibration, remaining time, observed blink total and posture average. These support progress and paused recovery. Unselected checks are not computed, saved or used for session alerts. Camera summaries are collected only during study blocks, not rests or exercise.
- With camera checks active in a guided study session, ScreenWell can save the duration of a sustained period out of camera view. Unusable lighting or a lost camera signal cannot establish a step-away. You can confirm or dismiss break credit for time away that overlaps a scheduled rest.

Data is not encrypted. Windows account permissions protect it from other ordinary accounts; anyone with access to your Windows account or backups may read it. There is no claim that this is a medical record or a secure clinical system. History remains until deleted; UI reports cover recent history (up to a year internally).

## Never recorded or transmitted

Camera frames, photographs, recordings, and landmark arrays are never written to the database or to image/video files. A frame is transferred to a local worker in memory, analysed, closed, and discarded. Preview landmarks also remain in memory. There is no recording API or upload path. The app never requests microphone access or reads other applications' text or keystrokes.

The camera is OFF at each launch even if consent was previously given. Outside guided study, consent enables a separate **Start camera** control. In guided study, choosing blink, posture and/or screen-distance checks and agreeing to camera access allows **Start session** to start only those checks for calibration. Choosing none keeps the camera off. Session consent does not enable general camera consent, and session calibration does not overwrite general calibration. Minimizing keeps selected checks running; the consent and session screens state this explicitly. Pausing, ending, finishing, closing to tray, or quitting stops session capture. Saved sessions reopen paused and require an explicit resume choice before camera access. **Turn camera off** and consent revocation also stop capture. Hiding preview leaves capture on and says so explicitly. Camera failure leaves timers usable through **Continue without camera**.

Live confidence, position and relative-distance readings remain in memory. Alerts can show these live readings above ordinary desktop apps without reading those apps' content. A bounded, hidden Windows PowerShell query reads the app's local toast-notification setting through WinRT. It does not change Windows settings, registry preferences or policy. Native notification text contains the reminder title and an instruction to open ScreenWell; live camera readings stay in ScreenWell's own window.

Optional exercise movement cues compare a few current upper-body measurements in memory. They do not identify exercises or verify repetitions and are not saved as exercise-compliance records.

Camera startup may retry a transient busy-device error once after 500 milliseconds, while the same consent and capture request remain active. A denied permission is not retried. Stop or consent withdrawal cancels the retry; a genuinely disconnected camera stays stopped until the user starts it again.

## Enforcement and evidence

The renderer is sandboxed with context isolation and no Node integration. A strict Content Security Policy allows only local content. An Electron session request handler rejects all remote URLs before dispatch, and developer switches disable Chromium background networking. A build scan rejects direct remote runtime loads. The automated Electron test attempts a remote request and expects rejection, exercises local operation under simulated offline conditions, and checks that no image/video artifacts were created in its test profile. These checks are application-level evidence, not a packet-capture certification of an entire Windows machine.

The privacy screen reports blocked request attempts. It does not invent a network byte counter. “0 frames saved” describes the absence of a recording/storage path.

## Export and delete

**Your progress** exports CSV or PDF to a user-chosen local path. PDFs use a bundled font. CSV cells are quoted and formula prefixes are neutralised. Exported files are outside the app's history and remain until you delete them yourself.

**Profile → Delete all my data** asks once, then deletes profile, daily priorities and focus goals, events, calibration, and local feedback; clears SQLite WAL contents; vacuums the database; disables start-with-Windows; stops the camera; and returns to onboarding. It cannot erase copies in exports, backups, or operating-system storage snapshots. Demo data uses an in-memory database and cannot overwrite personal history. Deleting all data while in demo also clears the personal database.

Feedback is never sent to anyone. You can view local feedback in SQLite if you choose; no service receives it. No special-category inferences are made from optional demographic answers.

Version 1.1 also stores numerical face anchors, head angles, shoulder-relative calibration, model choice and calibration timestamps. A small face-region brightness sample is examined in worker memory to reject unusable views and is never saved or sent. Proximity duration and smoothing history remain in memory. Only alert events and existing numerical summaries are logged. There is no face recognition or gaze identification.
