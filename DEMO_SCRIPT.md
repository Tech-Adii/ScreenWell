# ScreenWell: a three-minute mentor demo

Prepare: open the app, complete onboarding, keep the camera off, and select **Privacy & purpose → Mentor demo → Enter labelled demo mode**. Explain that the banner marks synthetic activity in a separate in-memory database.

| Time      | Show                                                                            | Explain                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Overview, then Why this feature?                                                | “91 students informed the design. Focus and workload made breaks difficult. We designed around control, privacy, and returning to work.” |
| 0:30–1:00 | Demo → Preview a break reminder → choose a snooze; then Breaks & focus → 30 min | “Every reminder can wait. Important task mode pauses all reminders for an exam, class, or deep work. Nothing locks the screen.”          |
| 1:00–1:25 | End focus, log a glass in Hydration                                             | “This goal is personal habit support. Logging and reminders work completely offline.”                                                    |
| 1:25–1:55 | Move & reset → start a routine → pause/close                                    | “The coach uses local rules. All SVG animations, instructions, and timers are bundled. Stop if a movement hurts.”                        |
| 1:55–2:25 | Your progress → weekly charts → score explanation → export PDF                  | “These are clearly labelled sample records. Real reports use only logged/observed data. Missing camera measurements are not zero.”       |
| 2:25–2:50 | Privacy; Camera controls (without starting camera)                              | “Video stays in memory on this device. Nothing is saved or sent. The camera is off by default, and the core app works without it.”       |
| 2:50–3:00 | Local feedback → leave demo mode                                                | “The next design-thinking cycle is testing with students. Leaving the demo restores real history unchanged.”                             |

Optional follow-up with consent: start the camera, wait for local model loading, perform ten-second eye calibration, keep both shoulders visible and calibrate posture. Explain that frontal-camera estimates and 8 FPS sampling have accuracy limits. Do not claim diagnosis, fatigue detection certainty, measured physical distance, or clinical posture assessment.

If asked about architecture: Electron owns scheduling and SQLite. The sandboxed React renderer owns presentation. MediaPipe WASM runs in a worker at capped capture rate. CSP and a request filter enforce local runtime assets. Models and fonts are downloaded only by the developer before packaging.
