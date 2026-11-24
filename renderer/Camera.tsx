import { useEffect, useState } from 'react';
import {
  Camera as CameraIcon,
  CameraOff,
  Eye,
  ScanFace,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Settings, Snapshot } from '../shared/types';
import { VisionController } from './useVision';
import { Toggle } from './components';
import ScreenDistance, { VisionModelPicker, qualityLabels } from './ScreenDistance';
import { poseModels } from '../vision/models';
import { LiveMonitor } from './LiveMonitor';
export default function Camera({
  data,
  save,
  v,
}: {
  data: Snapshot;
  save: (s: Settings) => Promise<void>;
  v: VisionController;
}) {
  const [status, setStatus] = useState('');
  const [modelSaving, setModelSaving] = useState(false);
  const saveModel = async (settings: Settings) => {
    setModelSaving(true);
    try {
      await save(settings);
    } finally {
      setModelSaving(false);
    }
  };
  const [s, set] = useState(data.settings);
  useEffect(() => {
    if (v.on) v.attachPreview();
  }, [v.on]);
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">OPTIONAL. LOCAL. ALWAYS YOUR CHOICE.</p>
        <h1>A gentle check-in</h1>
        <p>Eye and posture awareness, with your camera or without it.</p>
      </div>
      <LiveMonitor data={data} />
      {!data.settings.cameraConsent && (
        <section className="card camera-consent">
          <ShieldCheck size={34} />
          <div>
            <h2>Your camera, your choice.</h2>
            <p>Video stays on your computer. Nothing is saved or sent anywhere.</p>
            <p className="muted">
              Frames are processed in memory on this device. Only numerical summaries are saved.
              Camera estimates can be wrong and may miss quick blinks. Timers work without a camera.
            </p>
            <button
              className="primary"
              onClick={() => void save({ ...data.settings, cameraConsent: true })}
            >
              I agree · enable camera controls
            </button>
          </div>
        </section>
      )}
      <VisionModelPicker data={data} v={v} save={saveModel} />
      <div className="two-col space-top">
        <section className="card camera-panel">
          <div className="card-heading">
            <h2>Live preview</h2>
            <span className={`camera-indicator ${v.on ? 'on' : ''}`}>
              <i />
              {v.on ? 'Camera ON' : 'Camera OFF'}
            </span>
          </div>
          <div
            style={{ aspectRatio: v.aspect }}
            className={`video-frame ${!data.settings.showPreview ? 'hidden-preview' : ''}`}
          >
            <video ref={v.video} muted playsInline aria-label="Live local camera preview" />
            <canvas ref={v.canvas} width={640} height={480} aria-hidden="true" />
            {(!v.on || !data.settings.showPreview) && (
              <div className="video-placeholder">
                {v.on ? <Eye size={40} /> : <CameraOff size={40} />}
                <strong>
                  {v.on ? 'Preview hidden. Camera is still ON.' : 'Your camera is resting.'}
                </strong>
                <p>
                  {v.on
                    ? 'Use Turn camera off to stop capture.'
                    : 'Breaks, water, and exercises work without it.'}
                </p>
              </div>
            )}
            {v.loading && (
              <div className="video-loading" role="status">
                Loading local models…
              </div>
            )}
          </div>
          <div className="camera-buttons">
            {v.on || v.loading ? (
              <button className="primary" onClick={v.stop}>
                <CameraOff size={17} />
                Turn camera off
              </button>
            ) : (
              <button
                className="primary"
                disabled={!data.settings.cameraConsent || modelSaving}
                onClick={() => void v.start()}
              >
                <CameraIcon size={17} />
                Start camera
              </button>
            )}
            {v.on && (
              <button
                className="secondary"
                onClick={() =>
                  void save({ ...data.settings, showPreview: !data.settings.showPreview })
                }
              >
                {data.settings.showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            )}
          </div>
          <p className="small-print muted">
            Up to {poseModels[data.settings.visionMode].fps} frames/second ·{' '}
            {poseModels[data.settings.visionMode].label} · no recording
          </p>
          {v.on && (
            <div className={`tracking-status quality-${v.metrics.quality}`}>
              <i />
              {qualityLabels[v.metrics.quality]}
              {v.metrics.ready && (
                <small>{Math.round(v.metrics.inferenceMs)} ms / analysed frame</small>
              )}
            </div>
          )}
          {v.error && (
            <p className="error" role="alert">
              {v.error}
            </p>
          )}
        </section>
        <div className="stack">
          <section className="card">
            <span className="stat-icon peach">
              <Eye size={22} />
            </span>
            <h2>Eye comfort</h2>
            <div className="camera-stats">
              <div>
                <strong>{v.metrics.blinksPerMinute ?? '—'}</strong>
                <small>blinks / minute</small>
              </div>
              <div>
                <strong>{v.metrics.totalBlinks}</strong>
                <small>session blinks</small>
              </div>
            </div>
            <p className="muted">
              {v.calibration !== null
                ? `Calibration · ${v.calibration}s. Look ahead naturally and blink as usual.`
                : v.on
                  ? v.metrics.blinksPerMinute === null
                    ? 'Allow 60 seconds of a clear face view for a full-minute rate.'
                    : v.metrics.blinksPerMinute < data.settings.lowBlinkRate
                      ? 'A gentle reminder to blink and look around.'
                      : 'Your blink rhythm is being observed.'
                  : 'Camera off. Try the timed 20-20-20 eye rest.'}
            </p>
            <button className="text-button" disabled={!v.metrics.ready} onClick={v.calibrateEyes}>
              <RefreshCw size={14} />
              {data.settings.blinkThreshold ? 'Recalibrate eyes' : 'Calibrate eyes · 10 seconds'}
            </button>
          </section>
          <section className="card">
            <span className="stat-icon green">
              <ScanFace size={22} />
            </span>
            <h2>Posture awareness</h2>
            <div className="posture-score">
              <strong>{v.metrics.posture ?? '—'}</strong>
              <span>/ 100</span>
            </div>
            <p className="muted">{v.metrics.message}</p>
            <button
              className="secondary"
              disabled={
                !v.metrics.ready ||
                v.metrics.quality !== 'clear' ||
                !v.metrics.baseline ||
                v.positionCalibration !== null
              }
              onClick={() =>
                void v
                  .calibratePosture()
                  .catch(() => setStatus('Couldn’t save baseline. Try again.'))
              }
            >
              <Check size={15} />
              {v.positionCalibration?.kind === 'posture'
                ? `Hold comfortably · ${v.positionCalibration.left}s`
                : 'Calibrate comfortable posture'}
            </button>
            <small className="block muted">
              Sit comfortably straight with face and shoulders in view. Keep your camera position
              consistent. Hold still for four seconds. Unstable or incomplete views won’t be saved.
            </small>
          </section>
        </div>
      </div>
      <ScreenDistance data={data} v={v} />
      <section className="card space-top">
        <h2>Prefer a camera-free check-in?</h2>
        <p className="muted">
          Feel your feet on the floor. Let your shoulders drop. Give your back the support it needs.
        </p>
        <button
          className="secondary"
          onClick={() =>
            void window.screenwell
              .event('posture-check', 1, 'Camera-free check-in')
              .then(() => setStatus('Check-in saved. Thanks for making a moment.'))
          }
        >
          I checked my posture
          <Check size={16} />
        </button>
        <span className="inline-status" role="status">
          {status}
        </span>
      </section>
      <section className="card space-top">
        <h2>Make the reminders comfortable</h2>
        <div className="form-row">
          <label>
            Too-close alert after (seconds)
            <input
              type="number"
              min={3}
              max={30}
              value={s.distanceHoldSeconds}
              onChange={(e) => set({ ...s, distanceHoldSeconds: Number(e.target.value) })}
            />
          </label>
          <label>
            Face size trigger (% of baseline)
            <input
              type="number"
              min={110}
              max={160}
              step={5}
              value={Math.round(s.distanceScale * 100)}
              onChange={(e) => set({ ...s, distanceScale: Number(e.target.value) / 100 })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Distance alert cooldown (seconds)
            <input
              type="number"
              min={15}
              max={600}
              value={s.distanceCooldownSeconds}
              onChange={(e) => set({ ...s, distanceCooldownSeconds: Number(e.target.value) })}
            />
          </label>
          <p className="small-print muted">
            A higher face-size trigger is less sensitive. The default is 125%. Alerts need steady
            tracking, and wait during Focus mode, quiet hours, and snooze.
          </p>
        </div>
        <div className="form-row">
          <label>
            Low blink prompt below (per minute)
            <input
              type="number"
              min={1}
              max={30}
              value={s.lowBlinkRate}
              onChange={(e) => set({ ...s, lowBlinkRate: Number(e.target.value) })}
            />
          </label>
          <label>
            Score below 80 must persist for (seconds)
            <input
              type="number"
              min={5}
              max={120}
              value={s.postureHoldSeconds}
              onChange={(e) => set({ ...s, postureHoldSeconds: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Alert cooldown (minutes)
            <input
              type="number"
              min={1}
              max={60}
              value={s.cooldownMinutes}
              onChange={(e) => set({ ...s, cooldownMinutes: Number(e.target.value) })}
            />
          </label>
          <p className="muted small-print">
            Estimates compare your current position with your baseline. They support habits, and do
            not measure spinal health or diagnose fatigue.
          </p>
        </div>
        <button
          className="primary"
          onClick={() =>
            void save({
              ...data.settings,
              lowBlinkRate: s.lowBlinkRate,
              postureHoldSeconds: s.postureHoldSeconds,
              cooldownMinutes: s.cooldownMinutes,
              distanceHoldSeconds: s.distanceHoldSeconds,
              distanceScale: s.distanceScale,
              distanceCooldownSeconds: s.distanceCooldownSeconds,
            })
              .then(() => setStatus('Camera preferences saved.'))
              .catch(() => setStatus('Check the values and try again.'))
          }
        >
          Save camera preferences
        </button>
        {data.settings.cameraConsent && (
          <Toggle
            label="Camera consent"
            description="Turn off to revoke permission and stop the camera immediately."
            checked={data.settings.cameraConsent}
            onChange={(on) => void save({ ...data.settings, cameraConsent: on })}
          />
        )}
      </section>
    </>
  );
}
