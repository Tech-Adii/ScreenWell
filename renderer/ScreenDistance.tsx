import { Check, Gauge, Ruler } from 'lucide-react';
import { Settings, Snapshot } from '../shared/types';
import { VisionController } from './useVision';
import { useState } from 'react';
export function VisionModelPicker({
  data,
  v,
  save,
}: {
  data: Snapshot;
  v: VisionController;
  save: (s: Settings) => Promise<void>;
}) {
  const [error, setError] = useState('');
  return (
    <section className="card camera-model-card">
      <div>
        <Gauge size={21} />
        <div>
          <h2>Choose your camera balance</h2>
          <p className="muted">
            Full and Heavy models use more processing. Model detail improves pose estimates; it does
            not guarantee correct posture judgments.
          </p>
        </div>
      </div>
      <label>
        Pose model
        <select
          aria-label="Pose model"
          disabled={v.on || v.loading}
          value={data.settings.visionMode}
          onChange={(e) =>
            void save({ ...data.settings, visionMode: e.target.value as Settings['visionMode'] })
              .then(() => setError(''))
              .catch(() => setError('Couldn’t save the camera model. Try again.'))
          }
        >
          <option value="lite">Lightweight · lower CPU</option>
          <option value="full">Full · balanced accuracy</option>
          <option value="heavy">Heavy · highest model detail</option>
        </select>
      </label>
      <small className="muted">
        {v.on
          ? 'Turn the camera off to change models.'
          : 'All three models are bundled. No download is needed.'}
      </small>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
export const qualityLabels = {
  clear: 'Clear, steady view',
  'no-face': 'Waiting for a face',
  lighting: 'Improve lighting',
  turned: 'Face the screen',
  multiple: 'One person at a time',
  settling: 'Finding a steady view',
};
export default function ScreenDistance({ data, v }: { data: Snapshot; v: VisionController }) {
  const close = v.metrics.distanceState === 'close',
    percent = v.metrics.distanceRatio === null ? null : Math.round(100 / v.metrics.distanceRatio),
    remaining = Math.max(0, Math.ceil(data.settings.distanceHoldSeconds - v.metrics.closeSeconds));
  return (
    <section
      className={`card distance-panel space-top ${close ? 'distance-close' : ''}`}
      aria-label="Screen distance monitoring"
    >
      <div className="distance-heading">
        <span className="stat-icon blue">
          <Ruler size={23} />
        </span>
        <div>
          <p className="eyebrow">A LITTLE MORE BREATHING ROOM</p>
          <h2>Your screen distance</h2>
        </div>
        <span className={`distance-badge ${close ? 'close' : ''}`}>
          {!v.on
            ? 'Camera off'
            : !data.settings.distanceBaseline
              ? 'Needs calibration'
              : close
                ? 'A little close'
                : v.metrics.distanceState === 'comfortable'
                  ? 'Comfortable'
                  : 'Check paused'}
        </span>
      </div>
      <div className="distance-layout">
        <div className="distance-gauge">
          <strong>{percent === null ? '—' : `${percent}%`}</strong>
          <small>relative distance estimate</small>
          <div
            className="distance-track"
            role="progressbar"
            aria-label="Relative screen distance"
            aria-valuemin={0}
            aria-valuemax={160}
            aria-valuenow={percent === null ? undefined : Math.min(160, percent)}
          >
            <i style={{ width: `${Math.min(100, ((percent ?? 0) / 160) * 100)}%` }} />
            <span style={{ left: '62.5%' }} />
          </div>
          <small>100% is your calibrated position. No centimetre measurement.</small>
        </div>
        <div>
          <p className="distance-message" role="status">
            {!v.on
              ? 'Start the camera when you want a distance check.'
              : !data.settings.distanceBaseline
                ? 'Sit at a comfortable distance and save your starting position. Your shoulders don’t need to be visible.'
                : close
                  ? `Move back a little when you’re ready. A gentle reminder appears after ${data.settings.distanceHoldSeconds} continuous seconds.`
                  : v.metrics.distanceState === 'comfortable'
                    ? 'You have a little room between you and your work.'
                    : 'Face the screen with one clear face in view. Uncertain estimates won’t trigger alerts.'}
          </p>
          {close && (
            <div className="distance-countdown">
              <span className="countdown-chip" aria-hidden="true">
                {remaining}s
              </span>
              <span>
                {remaining === 0
                  ? 'Reminder ready · respects Focus mode and snooze'
                  : `${remaining}s until a gentle reminder`}
              </span>
            </div>
          )}
          <button
            className="secondary"
            disabled={
              !v.metrics.ready || v.metrics.quality !== 'clear' || v.positionCalibration !== null
            }
            onClick={v.calibrateScreenDistance}
          >
            <Ruler size={16} />
            {v.positionCalibration?.kind === 'distance'
              ? `Hold comfortably · ${v.positionCalibration.left}s`
              : data.settings.distanceBaseline
                ? 'Recalibrate screen distance'
                : 'Calibrate screen distance'}
          </button>
        </div>
      </div>
      {v.positionCalibration && (
        <div className="position-calibration" role="status">
          Hold your comfortable position. {v.positionCalibration.left}s of steady tracking needed.
          If you move or leave view, the countdown restarts.
        </div>
      )}
      {v.calibrationMessage && (
        <p className="calibration-saved" role="status">
          <Check size={16} />
          {v.calibrationMessage}
        </p>
      )}
      <p className="small-print muted">
        Brief 2–3 second movements won’t trigger the default alert. Distance works even when your
        shoulders are outside the camera view. Returning to a comfortable distance clears its alert.
      </p>
    </section>
  );
}
