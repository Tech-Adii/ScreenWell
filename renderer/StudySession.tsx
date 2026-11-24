import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Check,
  Clock3,
  Eye,
  ScanFace,
  Droplets,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  CameraOff,
  CalendarClock,
  Flag,
  Leaf,
} from 'lucide-react';
import {
  Snapshot,
  StudyConfig,
  StudyAction,
  StudyPreset,
  StudySession as Session,
} from '../shared/types';
import {
  defaultStudyConfig,
  hasStudy,
  studyPlan,
  studyReady,
  studyRemaining,
  studyHasCamera,
} from '../shared/study';
import { formatCountdown } from '../shared/wellness';
import { VisionController } from './useVision';
import { Toggle } from './components';
import ExerciseArt from './ExerciseArt';
import { exercises } from './exerciseLibrary';
import { LiveMonitor, BackgroundStatus } from './LiveMonitor';
import StudyProfiles from './StudyProfiles';
import AwayRestReview from './AwayRestReview';
const duration = (seconds: number) =>
  seconds < 60
    ? `${seconds} sec`
    : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} sec` : ''}`;
export function SessionTracking({
  session,
  v,
  act,
}: {
  session: Session;
  v: VisionController;
  act: (action: StudyAction) => Promise<void>;
}) {
  useEffect(() => {
    v.attachPreview();
  }, [v.on]);
  const selected = studyHasCamera(session.config);
  return (
    <section className="card session-tracking">
      <div className="session-card-heading">
        <div>
          <p className="eyebrow">ONLY THE CHECKS YOU CHOOSE</p>
          <h2>Camera for this session</h2>
        </div>
        <span className={`session-camera-badge ${v.on ? 'on' : ''}`}>
          {v.on ? 'Camera ON' : 'Camera OFF'}
        </span>
      </div>
      {selected ? (
        <>
          <div className="session-check-badges">
            <span className={session.config.blinks ? 'selected' : ''}>
              <Eye size={14} />
              {session.config.blinks ? 'Blink tracking selected' : 'Blink tracking off'}
            </span>
            <span className={session.config.posture ? 'selected' : ''}>
              <ScanFace size={14} />
              {session.config.posture ? 'Posture tracking selected' : 'Posture tracking off'}
            </span>
          </div>
          {session.config.distance && (
            <div className="session-check-badges">
              <span className="selected">Screen-distance tracking selected</span>
            </div>
          )}
          <div className="session-video" style={{ aspectRatio: v.aspect }}>
            <video ref={v.video} muted playsInline aria-label="Session camera preview" />
            <canvas ref={v.canvas} width={640} height={480} aria-hidden="true" />
            {!v.on && (
              <div>
                <CameraOff size={28} />
                <span>
                  {v.loading ? 'Starting the selected checks…' : 'Your camera is resting.'}
                </span>
              </div>
            )}
          </div>
          <p className="session-tracking-message" role="status">
            {v.error ||
              (session.status === 'preparing' && v.calibrationMessage) ||
              v.metrics.message}
          </p>
          {session.config.blinks && (
            <div className="session-calibration-row">
              <div>
                <strong>
                  <Eye size={15} />
                  Blink calibration
                </strong>
                <small>
                  {v.calibration !== null
                    ? `Observe normal blinking · ${v.calibration} seconds left`
                    : session.calibration.blinkThreshold
                      ? 'Ready for this session'
                      : 'Face the camera and blink normally for 10 seconds.'}
                </small>
              </div>
              <button
                className="secondary"
                disabled={!v.metrics.ready || v.calibration !== null || !v.on}
                onClick={v.calibrateEyes}
              >
                {session.calibration.blinkThreshold && <Check size={13} />}
                {session.calibration.blinkThreshold ? 'Recalibrate blinks' : 'Calibrate blinks'}
              </button>
            </div>
          )}
          {session.config.posture && (
            <div className="session-calibration-row">
              <div>
                <strong>
                  <ScanFace size={15} />
                  Comfortable posture
                </strong>
                <small>
                  {v.positionCalibration
                    ? `Hold a steady, comfortable position · ${v.positionCalibration.left}s`
                    : session.calibration.baseline
                      ? `Ready · alerts below 80 for ${session.config.postureHoldSeconds}s. Recalibrate if the camera moves.`
                      : 'Sit comfortably upright with your face and both shoulders visible.'}
                </small>
              </div>
              <button
                className="secondary"
                disabled={
                  !v.on ||
                  !v.metrics.ready ||
                  v.metrics.quality !== 'clear' ||
                  !v.metrics.baseline ||
                  !!v.positionCalibration
                }
                onClick={() => void v.calibratePosture()}
              >
                {session.calibration.baseline && <Check size={13} />}
                {session.calibration.baseline ? 'Recalibrate posture' : 'Calibrate posture'}
              </button>
            </div>
          )}
          <div className="session-camera-actions">
            {session.config.distance && (
              <button
                className="secondary"
                disabled={!v.on || v.metrics.quality !== 'clear' || !!v.positionCalibration}
                onClick={v.calibrateScreenDistance}
              >
                {session.calibration.distanceBaseline
                  ? 'Recalibrate distance'
                  : 'Calibrate screen distance'}
              </button>
            )}
            {v.on ? (
              <button className="secondary" onClick={() => void act({ type: 'camera-off' })}>
                <CameraOff size={14} />
                Turn camera off
              </button>
            ) : (
              <button
                className="secondary"
                disabled={v.loading || session.status === 'paused'}
                onClick={() => void act({ type: 'camera-on', cameraConsent: true })}
              >
                Start selected checks
              </button>
            )}
            <button className="text-button" onClick={() => void act({ type: 'without-camera' })}>
              Continue without camera
            </button>
          </div>
          <p className="small-print muted">
            <ShieldCheck size={12} />
            Processed on this device. No video is recorded. Stop the camera at any time.
          </p>
        </>
      ) : (
        <div className="session-camera-free">
          <CameraOff size={31} />
          <strong>A camera-free session.</strong>
          <p>Blink and posture checks are off. Your study plan and reminders still work.</p>
        </div>
      )}
    </section>
  );
}
function SessionExercise({
  session,
  now,
  v,
}: {
  session: Session;
  now: number;
  v: VisionController;
}) {
  const step = session.steps[session.index],
    remaining = studyRemaining(session, now) / 1000;
  const routine = useMemo(
    () =>
      ['shoulder-roll', 'wrist-flexor', 'stand']
        .map((id) => exercises.find((exercise) => exercise.id === id))
        .filter((item): item is (typeof exercises)[number] => !!item),
    [],
  );
  const index = Math.min(
      routine.length - 1,
      Math.floor((step.seconds - remaining) / (step.seconds / routine.length)),
    ),
    exercise = routine[index] ?? exercises[3];
  const anchor = useRef(v.metrics.baseline),
    [movement, setMovement] = useState(false);
  useEffect(() => {
    const current = v.metrics.baseline,
      first = anchor.current;
    if (!current || v.metrics.quality !== 'clear') return;
    if (!first) {
      anchor.current = current;
      return;
    }
    if (
      Math.abs(current.tilt - first.tilt) > 3 ||
      Math.abs(current.lean - first.lean) > 0.025 ||
      Math.abs(current.shoulderY - first.shoulderY) > 0.025
    )
      setMovement(true);
  }, [v.metrics]);
  return (
    <section className="card session-exercise">
      <div>
        <p className="eyebrow">A LITTLE MOVEMENT, ON YOUR TERMS</p>
        <p className="eyebrow">
          MOVEMENT {index + 1} OF {routine.length}
        </p>
        <h2>{exercise.name}</h2>
        <ol>
          {exercise.steps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="exercise-safety">
          Move gently and stop if anything hurts. Choose a seated alternative when it is more
          comfortable.
        </p>
        {session.config.posture && v.on ? (
          <p className="session-movement-cue">
            <ScanFace size={16} />
            {v.metrics.quality !== 'clear'
              ? 'Keep your face and shoulders in view for movement cues.'
              : movement
                ? 'Some upper-body movement observed.'
                : 'Upper body visible. Move within a comfortable range.'}
          </p>
        ) : (
          <p className="muted small-print">Follow the illustrated guide at your pace.</p>
        )}
        <small className="muted">Camera cues cannot verify every exercise or repetition.</small>
      </div>
      <ExerciseArt motion={exercise.motion} large />
    </section>
  );
}
export default function StudySessionPage({
  data,
  now,
  v,
}: {
  data: Snapshot;
  now: number;
  v: VisionController;
}) {
  const [config, setConfig] = useState<StudyConfig>({ ...defaultStudyConfig }),
    [selectedPreset, setSelectedPreset] = useState<string | null>('balanced-study'),
    [custom, setCustom] = useState(false),
    [review, setReview] = useState(false),
    [planning, setPlanning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const session = data.study,
    active = hasStudy(session),
    steps = useMemo(() => studyPlan(config), [config]);
  const total = steps.reduce((sum, step) => sum + step.seconds, 0),
    rests = steps.filter((step) => step.kind === 'rest').length,
    exerciseCount = steps.filter((step) => step.kind === 'exercise').length;
  const update = <K extends keyof StudyConfig>(key: K, value: StudyConfig[K]) => {
    if (key !== 'cameraConsent') setSelectedPreset(null);
    setConfig((previous) => {
      const next = { ...previous, [key]: value };
      if (key === 'blinks' || key === 'posture' || key === 'distance' || !studyHasCamera(next)) {
        next.cameraConsent = false;
      }
      return next;
    });
  };
  const loadPreset = (preset: StudyPreset) => {
    setSelectedPreset(preset.id);
    setConfig({ ...preset.config, cameraConsent: false });
    setCustom(![60, 120, 180].includes(preset.config.studyMinutes));
    setReview(false);
    setError('');
  };
  const act = async (action: StudyAction) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await window.screenwell.studyAction(action);
    } catch {
      setError(
        'Couldn’t update the session. Check the selected camera calibrations and try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await window.screenwell.startStudy(config);
      setPlanning(false);
      setReview(false);
    } catch {
      setError('Couldn’t start. Check the study time and camera permission, then try again.');
    } finally {
      setBusy(false);
    }
  };
  if (active) {
    const step = session.steps[session.index],
      left = studyRemaining(session, Math.max(now, session.lastTickAt)),
      elapsed =
        session.completedStudySeconds +
        (step.kind === 'study' ? Math.max(0, step.seconds - left / 1000) : 0),
      percent = Math.min(100, (elapsed / (session.config.studyMinutes * 60)) * 100),
      preparing = session.status === 'preparing',
      paused = session.status === 'paused';
    return (
      <div className="study-page">
        <div className="study-heading">
          <div>
            <p className="eyebrow">YOUR TIME, WITH ROOM TO RESET</p>
            <h1>Your study session, {data.settings.name}.</h1>
            <p>
              {session.config.studyMinutes} minutes of study · {session.config.blockMinutes}-minute
              blocks · {session.config.restSeconds}-second eye rests
            </p>
          </div>
          <span className="session-mode-tag">
            <CalendarClock size={15} />
            {preparing
              ? 'Preparing your checks'
              : paused
                ? 'Paused'
                : step.kind === 'study'
                  ? 'Study time'
                  : step.kind === 'rest'
                    ? 'Look-away rest'
                    : 'Movement break'}
          </span>
        </div>
        <section className={`session-live-hero ${step.kind}`}>
          <div>
            <span className="session-step-label">
              STEP {Math.min(session.index + 1, session.steps.length)} OF {session.steps.length}
            </span>
            <h2>
              {preparing
                ? 'A comfortable start.'
                : paused
                  ? 'Your space is paused.'
                  : step.kind === 'study'
                    ? 'One block at a time.'
                    : step.kind === 'rest'
                      ? 'Your study block is up.'
                      : 'Time for a little movement.'}
            </h2>
            <p>
              {preparing
                ? 'Finish only the calibrations you selected. Your study timer starts when you’re ready.'
                : paused
                  ? session.pauseReason
                  : step.kind === 'study'
                    ? 'Your plan will remind you to rest, drink water and move. Keep a comfortable pace.'
                    : step.kind === 'rest'
                      ? `Stop looking at the screen. Look at something in the distance for ${session.config.restSeconds} seconds.`
                      : 'Follow the illustrated movements below. Posture alerts rest while you exercise.'}
            </p>
            <div className="session-live-actions">
              {preparing ? (
                <>
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      !studyReady(session) ||
                      !v.on ||
                      !v.metrics.ready ||
                      v.calibration !== null ||
                      !!v.positionCalibration
                    }
                    onClick={() => void act({ type: 'begin' })}
                  >
                    <Play size={16} />
                    Begin study time
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => void act({ type: 'without-camera' })}
                  >
                    Begin without camera checks
                  </button>
                </>
              ) : paused ? (
                <>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void act({
                        type: 'resume',
                        cameraConsent: studyHasCamera(session.config),
                      })
                    }
                  >
                    <Play size={16} />
                    {studyHasCamera(session.config)
                      ? 'Resume with selected camera checks'
                      : 'Resume study session'}
                  </button>
                  {studyHasCamera(session.config) && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => void act({ type: 'without-camera' })}
                    >
                      Resume without camera
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => void act({ type: 'pause' })}
                  >
                    <Pause size={15} />
                    Pause session
                  </button>
                  {step.kind !== 'study' && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void act({ type: 'skip' })}
                    >
                      Skip this {step.kind === 'rest' ? 'rest' : 'exercise'}
                    </button>
                  )}
                </>
              )}
              <button
                className="text-button session-end"
                disabled={busy}
                onClick={() => void act({ type: 'end' })}
              >
                End session
              </button>
            </div>
          </div>
          <div className="session-clock" role="timer" aria-label="Current session step remaining">
            <span>
              {preparing
                ? 'READY WHEN YOU ARE'
                : paused
                  ? 'PAUSED'
                  : step.kind === 'study'
                    ? 'NEXT RESET IN'
                    : 'A LITTLE SPACE'}
            </span>
            <strong>{preparing ? 'Ready' : formatCountdown(left)}</strong>
            <small>
              {step.kind === 'study'
                ? 'of focused study'
                : step.kind === 'rest'
                  ? 'look away from the screen'
                  : 'gentle movement'}
            </small>
          </div>
          <div className="session-progress">
            <div>
              <span>
                {Math.floor(elapsed / 60)} of {session.config.studyMinutes} study minutes
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Study plan progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
            >
              <i style={{ width: `${percent}%` }} />
            </div>
          </div>
        </section>
        <p className="session-error" role="status">
          {error}
        </p>
        {!data.engine.pending && <AwayRestReview session={session} />}
        {session.status === 'running' && step.kind === 'exercise' && (
          <SessionExercise key={step.id} session={session} now={now} v={v} />
        )}
        <BackgroundStatus data={data} />
        <LiveMonitor data={data} />
        <div className="session-details-grid">
          <SessionTracking session={session} v={v} act={act} />
          <div className="session-detail-stack">
            <section className="card session-observations">
              <p className="eyebrow">SELECTED FOR THIS SESSION</p>
              <h2>Your checks, at a glance</h2>
              <div>
                <span>
                  <Eye size={18} />
                  Blinks observed
                </span>
                <strong>{session.config.blinks ? session.blinks : 'Off'}</strong>
              </div>
              <div>
                <span>
                  <ScanFace size={18} />
                  Posture alert delay
                </span>
                <strong>
                  {session.config.posture ? `${session.config.postureHoldSeconds}s` : 'Off'}
                </strong>
              </div>
              <div>
                <span>
                  <Droplets size={18} />
                  Water reminders
                </span>
                <strong>{session.config.water ? 'After eye rests' : 'Off'}</strong>
              </div>
              <div>
                <span>
                  <Activity size={18} />
                  Exercise reminder
                </span>
                <strong>
                  {session.config.exerciseEveryMinutes
                    ? `Every ${session.config.exerciseEveryMinutes} study min`
                    : 'Off'}
                </strong>
              </div>
              {!!session.awaySeconds && (
                <div>
                  <span>
                    <Clock3 size={18} /> Time out of camera view
                  </span>
                  <strong>{duration(session.awaySeconds)}</strong>
                </div>
              )}
              <small>
                Unselected camera checks are not calculated for this session. Alerts pause during
                rests and exercises.
              </small>
            </section>
            <section className="card session-plan-mini">
              <h2>Coming up in your plan</h2>
              {session.steps.slice(session.index, session.index + 5).map((item, i) => (
                <div key={item.id} className={i === 0 ? 'current' : ''}>
                  <span>
                    {item.kind === 'study' ? (
                      <Play size={13} />
                    ) : item.kind === 'rest' ? (
                      <Eye size={13} />
                    ) : (
                      <Activity size={13} />
                    )}
                  </span>
                  <strong>
                    {i === 0 ? 'Now · ' : ''}
                    {item.kind === 'study'
                      ? 'Study'
                      : item.kind === 'rest'
                        ? 'Look away'
                        : 'Exercise'}
                  </strong>
                  <small>{duration(item.seconds)}</small>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    );
  }
  if (session && !planning && ['completed', 'ended'].includes(session.status))
    return (
      <div className="study-page">
        <section className="card session-summary">
          <span className="session-summary-icon">
            <Flag size={32} />
          </span>
          <p className="eyebrow">A LITTLE PROGRESS, MADE YOURS</p>
          <h1>
            {session.status === 'completed' ? 'You showed up' : 'Your session is saved'},{' '}
            {data.settings.name}.
          </h1>
          <p>
            {session.status === 'completed'
              ? 'Your planned study time is up. Give your eyes a little space before returning to the screen.'
              : 'You can make a new plan whenever you’re ready.'}
          </p>
          <div className="session-summary-stats">
            <div>
              <strong>{Math.round(session.completedStudySeconds / 60)}</strong>
              <span>study minutes completed</span>
            </div>
            {session.config.blinks && (
              <div>
                <strong>{session.blinks}</strong>
                <span>blinks observed</span>
              </div>
            )}
            {session.config.posture && (
              <div>
                <strong>
                  {session.postureSamples
                    ? Math.round(session.postureTotal / session.postureSamples)
                    : '—'}
                </strong>
                <span>average posture estimate</span>
              </div>
            )}
            {!!session.awaySeconds && (
              <div>
                <strong>{duration(session.awaySeconds)}</strong>
                <span>out of camera view</span>
              </div>
            )}
          </div>
          {!data.engine.pending && <AwayRestReview session={session} />}
          <p className="muted">
            <CameraOff size={15} />
            Camera checks have stopped.
          </p>
          <button
            className="primary"
            onClick={() => {
              setPlanning(true);
              setSelectedPreset(null);
              setCustom(![60, 120, 180].includes(session.config.studyMinutes));
              setConfig({
                ...defaultStudyConfig,
                studyMinutes: session.config.studyMinutes,
                exerciseEveryMinutes: session.config.exerciseEveryMinutes,
              });
            }}
          >
            Plan another session
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    );
  const invalid =
      config.studyMinutes < 20 ||
      config.studyMinutes > 480 ||
      !Number.isInteger(config.studyMinutes),
    needsCamera = studyHasCamera(config);
  return (
    <div className="study-page">
      <div className="study-heading">
        <div>
          <p className="eyebrow">A GOOD SESSION STARTS WITH A LITTLE PLAN</p>
          <h1>Let’s plan your study, {data.settings.name}.</h1>
          <p>Choose your time. We’ll make room for the pauses.</p>
        </div>
        <span className="session-mode-tag">
          <ShieldCheck size={14} />
          Your session stays on this device
        </span>
      </div>
      <StudyProfiles
        presets={data.studyPresets}
        config={config}
        selected={selectedPreset}
        disabled={busy}
        invalid={invalid}
        onLoad={loadPreset}
      />
      <div className="session-setup-grid">
        <div className="session-setup-controls">
          <section className="card session-time-card">
            <div className="session-section-title">
              <span>01</span>
              <div>
                <h2>How long are you planning to study?</h2>
                <p>Study time excludes rests and exercise breaks.</p>
              </div>
            </div>
            <div className="study-hour-options" role="group" aria-label="Planned study duration">
              {[60, 120, 180].map((minutes) => (
                <button
                  key={minutes}
                  aria-pressed={!custom && config.studyMinutes === minutes}
                  onClick={() => {
                    setCustom(false);
                    update('studyMinutes', minutes);
                  }}
                >
                  <strong>{minutes / 60}</strong>
                  <span>{minutes === 60 ? 'hour' : 'hours'}</span>
                </button>
              ))}
              <button aria-pressed={custom} onClick={() => setCustom(true)}>
                <Clock3 size={23} />
                <span>Your timing</span>
              </button>
            </div>
            {custom && (
              <label className="session-custom-hours">
                Study hours
                <input
                  aria-label="Custom study hours"
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={config.studyMinutes / 60}
                  onChange={(e) => update('studyMinutes', Math.round(Number(e.target.value) * 60))}
                />
              </label>
            )}
            <div className="session-rhythm-preview">
              <span>
                <Play size={15} />
                {config.blockMinutes} min study
              </span>
              <ArrowRight size={14} />
              <span>
                <Eye size={15} />
                {config.restSeconds} sec look away
              </span>
              <span>Repeat gently.</span>
            </div>
            <div className="session-preference-row">
              <label>
                Study block length
                <select
                  aria-label="Session study block length"
                  value={config.blockMinutes}
                  onChange={(e) => update('blockMinutes', Number(e.target.value))}
                >
                  {[...new Set([10, 15, 20, 25, 30, config.blockMinutes])]
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value} minutes
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Eye-rest duration
                <select
                  aria-label="Session eye-rest duration"
                  value={config.restSeconds}
                  onChange={(e) => update('restSeconds', Number(e.target.value))}
                >
                  {[...new Set([20, 30, 60, config.restSeconds])]
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value} seconds
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Exercise reminder
                <select
                  aria-label="Session exercise frequency"
                  value={config.exerciseEveryMinutes}
                  onChange={(e) => update('exerciseEveryMinutes', Number(e.target.value))}
                >
                  <option value={60}>Every 1 hour of study</option>
                  <option value={30}>Every 30 minutes of study</option>
                  <option value={90}>Every 90 minutes of study</option>
                  <option value={0}>No exercise reminders</option>
                </select>
              </label>
            </div>
            <Toggle
              label="Remind me to drink water"
              description="A gentle animated reminder after each look-away rest."
              checked={config.water}
              onChange={(value) => update('water', value)}
            />
          </section>
          <section className="card session-choice-card">
            <div className="session-section-title">
              <span>02</span>
              <div>
                <h2>Which camera checks would help?</h2>
                <p>
                  Choose the checks you want, or keep the camera off. Camera permission applies only
                  to this session.
                </p>
              </div>
            </div>
            <Toggle
              label="Count my blinks"
              description="Count observed blinks and check blink rhythm on this device."
              checked={config.blinks}
              onChange={(value) => update('blinks', value)}
            />
            <Toggle
              label="Check my posture"
              description="Calibrate your comfortable position, then nudge you after sustained poor posture."
              checked={config.posture}
              onChange={(value) => update('posture', value)}
            />
            {config.posture && (
              <label className="session-delay">
                Alert after continuous poor posture
                <select
                  aria-label="Session posture alert delay"
                  value={config.postureHoldSeconds}
                  onChange={(e) => update('postureHoldSeconds', Number(e.target.value))}
                >
                  {[20, 25, 30].map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Toggle
              label="Check my screen distance"
              description="Calibrate a comfortable distance. Show relative distance and remind me after 10 seconds too close. No centimetre estimate."
              checked={!!config.distance}
              onChange={(value) => update('distance', value)}
            />
            {needsCamera ? (
              <label className="session-camera-consent">
                <input
                  type="checkbox"
                  checked={config.cameraConsent}
                  onChange={(e) => update('cameraConsent', e.target.checked)}
                />
                <span>
                  <strong>Allow the camera for these checks in this session</strong>
                  <small>
                    We’ll start the camera, guide the selected calibrations, and then begin your
                    timer. Checks continue when minimized. Pause or end the session to stop capture.
                    Time out of view is logged on this device. You choose whether it counts as a
                    scheduled break.
                  </small>
                </span>
              </label>
            ) : (
              <div className="session-no-camera">
                <CameraOff size={18} />
                <span>No camera checks selected. The camera will stay off.</span>
              </div>
            )}
          </section>
        </div>
        <aside className="card session-review">
          <div className="session-section-title">
            <span>03</span>
            <div>
              <h2>Your session plan</h2>
              <p>A rhythm you can pause or end at any time.</p>
            </div>
          </div>
          <div className="session-plan-total">
            <strong>
              {Math.floor(config.studyMinutes / 60)}
              <span>h</span>
              {config.studyMinutes % 60 ? (
                <>
                  {' '}
                  {config.studyMinutes % 60}
                  <span>m</span>
                </>
              ) : null}
            </strong>
            <span>planned study time</span>
          </div>
          <div className="session-review-facts">
            <span>
              <Eye size={15} />
              {rests} look-away rests
            </span>
            <span>
              <Activity size={15} />
              {exerciseCount} exercise {exerciseCount === 1 ? 'break' : 'breaks'}
            </span>
            <span>
              <Clock3 size={15} />
              {duration(total)} including resets
            </span>
          </div>
          <ol className="session-plan-list">
            {steps.slice(0, review ? undefined : 6).map((item) => (
              <li key={item.id} className={item.kind}>
                <span>
                  {item.kind === 'study' ? (
                    <Play size={13} />
                  ) : item.kind === 'rest' ? (
                    <Eye size={13} />
                  ) : (
                    <Activity size={13} />
                  )}
                </span>
                <div>
                  <strong>
                    {item.kind === 'study'
                      ? 'Study block'
                      : item.kind === 'rest'
                        ? 'Look away from the screen'
                        : 'Gentle exercise'}
                  </strong>
                  <small>
                    {duration(item.seconds)}
                    {item.kind === 'rest' && config.water ? ' · water reminder follows' : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          {steps.length > 6 && (
            <button className="text-button session-plan-expand" onClick={() => setReview(!review)}>
              {review ? 'Show less' : `See all ${steps.length} steps`}
              <ArrowUpRight size={13} />
            </button>
          )}
          <p className="session-review-note">
            Session reminders use the plan shown here. Off-for-today choices still apply. Camera
            prompts rest during scheduled breaks.
          </p>
          <button
            className="primary session-start"
            disabled={busy || invalid || (needsCamera && !config.cameraConsent)}
            onClick={() => void start()}
          >
            <Play size={17} />
            {busy ? 'Preparing…' : 'Start session'}
            <ArrowRight size={17} />
          </button>
          <p className="session-error" role="status">
            {error || (invalid ? 'Choose between 20 minutes and 8 hours of study.' : '')}
          </p>
          <small className="session-review-footer">
            <Leaf size={12} />
            Your time, with a little more care.
          </small>
        </aside>
      </div>
    </div>
  );
}
