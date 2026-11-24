import { useState } from 'react';
import { Activity, Eye, ScanFace, MoveHorizontal, ShieldCheck, RefreshCw } from 'lucide-react';
import { Snapshot } from '../shared/types';
import { relativeDistance } from '../shared/monitor';
import { studyVisionSelection } from '../shared/study';
import { studySettings } from '../shared/study';
export function LiveMonitor({ data, compact = false }: { data: Snapshot; compact?: boolean }) {
  const m = data.monitor,
    selected = studyVisionSelection(data.study),
    hold = studySettings(data.settings, data.study).distanceHoldSeconds;
  if (!m?.cameraOn)
    return compact ? null : (
      <div className="live-monitor camera-resting">
        <ShieldCheck size={18} />
        <span>Camera off. Timers still work in the background.</span>
      </div>
    );
  return (
    <section
      className={`live-monitor ${compact ? 'compact' : ''}`}
      aria-label="Live camera readings"
    >
      <div className="monitor-title">
        <Activity size={15} />
        <strong>{m.trackingPaused ? 'Camera check paused' : 'Live camera readings'}</strong>
        <span>{m.background ? 'Background monitoring' : 'On-device processing'}</span>
      </div>
      <p className="monitor-tip" role="status">
        {m.trackingMessage}
      </p>
      <div className="monitor-values">
        <div>
          <span>Signal confidence</span>
          <strong>{m.confidence === null ? '—' : `${m.confidence}%`}</strong>
        </div>
        {selected.posture && (
          <div>
            <span>Posture score</span>
            <strong>{m.posture === null ? '—' : `${Math.round(m.posture)}/100`}</strong>
          </div>
        )}
        {selected.blinks && (
          <div>
            <span>
              <Eye size={12} />
              Blinks observed
            </span>
            <strong>{m.blinks ?? '—'}</strong>
            <small>
              {m.rate === null ? 'Rate needs 1 clear minute' : `${m.rate} blinks / min`}
            </small>
          </div>
        )}
        {selected.distance && (
          <div>
            <span>Relative distance</span>
            <strong>
              {m.distanceRatio === null ? '—' : `${(1 / m.distanceRatio).toFixed(2)}×`}
            </strong>
          </div>
        )}
      </div>
      {selected.posture && !m.trackingPaused && (
        <p
          className={`monitor-position ${m.posture !== null && m.position !== 'Comfortable posture' ? 'near' : ''}`}
        >
          <ScanFace size={14} />
          {m.position}
        </p>
      )}
      {selected.distance && (
        <p className={`monitor-position ${m.distanceState === 'close' ? 'near' : ''}`}>
          <MoveHorizontal size={14} />
          {relativeDistance(m.distanceRatio)}
          {m.distanceState === 'close' ? ` · ${Math.floor(m.closeSeconds)}s close` : ''}
        </p>
      )}
      {selected.distance && m.distanceState === 'close' && (
        <div className="distance-alert-progress">
          <span>Move back toward your calibrated position</span>
          <progress
            aria-label="Time close to screen"
            max={hold}
            value={Math.min(hold, m.closeSeconds)}
          />
          <small>
            {m.closeSeconds < hold
              ? `${Math.ceil(hold - m.closeSeconds)}s until reminder`
              : 'Reminder threshold reached · respects snooze and cooldown'}
          </small>
        </div>
      )}
      {!compact && !m.trackingPaused && (
        <p className="monitor-tip">
          {!m.fresh
            ? 'Waiting for fresh frames. Keep the camera connected; estimates pause when the signal is lost.'
            : m.confidence === null
              ? 'Face the camera in soft front light. Keep one person in view.'
              : selected.posture && m.posture === null
                ? 'Show both shoulders and recalibrate from your comfortable position.'
                : 'Recalibrate after moving your camera or changing your seat. Brief movements do not trigger posture alerts.'}
        </p>
      )}
      <small>
        Signal confidence is a heuristic from lighting, framing and visible landmarks, not validated
        model accuracy.
        {selected.distance
          ? ' Distance is relative to calibration, not a centimetre measurement.'
          : ''}
      </small>
    </section>
  );
}
export function BackgroundStatus({ data }: { data: Snapshot }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const blocked = data.notificationDelivery?.native === 'blocked';
  const os = window.screenwell.platform === 'darwin' ? 'macOS' : 'Windows';
  return (
    <section className="background-status card">
      <div>
        <span className="background-status-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <strong>Keep studying. ScreenWell stays with you.</strong>
          <p>
            Minimize this window to keep your session and selected camera checks running. Reminders
            appear above normal desktop apps without taking focus.
          </p>
        </div>
      </div>
      <div className="background-status-footer">
        <span>
          {blocked
            ? `${os} notifications blocked · ScreenWell popup fallback ready`
            : data.notificationDelivery?.setting === 'Enabled'
              ? `${os} notifications enabled · desktop popup ready`
              : `Desktop popups ready · ${os} delivery not verified`}
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await window.screenwell.checkNotifications();
            } catch {
              setError(`Could not check ${os} settings. Desktop popups remain available.`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={12} />
          {busy ? 'Checking…' : `Check ${os} status`}
        </button>
      </div>
      {error && <p role="status">{error}</p>}
      <small>
        Pause or end the session to stop tracking. Closing the window to the tray stops the camera.
      </small>
    </section>
  );
}
