import { useState, useEffect, useRef } from 'react';
import { Moon, Coffee, ArrowRight, Check, Pause, Play, X, Timer, BellOff } from 'lucide-react';
import { Settings, Snapshot } from '../shared/types';
import { isFocused, isQuiet } from '../engine/scheduler';
import { labels } from '../shared/defaults';
import { Mascot, Toggle } from './components';
import { useDialog } from './useDialog';
export function GuidedBreak({
  seconds,
  onClose,
  onComplete,
  eye = false,
}: {
  seconds: number;
  onClose: () => void;
  onComplete: () => Promise<void>;
  eye?: boolean;
}) {
  const dialogRef = useDialog();
  const [remaining, setRemaining] = useState(seconds),
    [paused, setPaused] = useState(false),
    [done, setDone] = useState(false),
    [saving, setSaving] = useState(false);
  const end = useRef(Date.now() + seconds * 1000);
  const [error, setError] = useState('');
  useEffect(() => {
    if (paused || done) return;
    end.current = Date.now() + remaining * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setDone(true);
    }, 250);
    return () => clearInterval(id);
  }, [paused, done]); // deadline keeps the countdown honest when backgrounded
  useEffect(() => {
    if (!done) return;
    setSaving(true);
    void onComplete()
      .catch(() => setError('Your break finished, but we couldn’t save it.'))
      .finally(() => setSaving(false));
  }, [done]);
  return (
    <div className="modal-backdrop">
      <section
        ref={dialogRef}
        className="break-modal"
        role="dialog"
        aria-modal="true"
        aria-label={done ? 'Welcome back' : 'Guided break'}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <button
          autoFocus
          className="dismiss-reminder"
          aria-label="Close guided break"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <p className="eyebrow">{done ? 'A LITTLE SPACE, WELL SPENT' : 'THIS MOMENT IS YOURS'}</p>
        <h1>
          {done ? 'Welcome back.' : eye ? 'Look a little further.' : 'Let your shoulders soften.'}
        </h1>
        <p className="muted">
          {done
            ? 'Take a breath. Choose one small thing to return to.'
            : eye
              ? 'Look at something about 20 feet away. Blink slowly, without strain.'
              : 'Look away from the screen. Breathe naturally. Move only as far as feels comfortable.'}
        </p>
        <div
          className="countdown-ring"
          style={
            { '--progress': `${((seconds - remaining) / seconds) * 360}deg` } as React.CSSProperties
          }
        >
          <div>
            {done ? (
              <Check size={45} />
            ) : (
              <>
                <strong>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </strong>
                <small>no rush</small>
              </>
            )}
          </div>
        </div>
        {done ? (
          <>
            <label>
              Your next small step <span className="optional">optional · not saved</span>
              <input maxLength={100} placeholder="e.g. Finish the next paragraph" />
            </label>
            <button className="primary" disabled={saving} onClick={onClose}>
              Return to my work
              <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
            <button className="secondary" onClick={() => setPaused(!paused)}>
              {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? 'Continue' : 'Pause'}
            </button>
            <p className="small-print muted">You can end this break at any time.</p>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="safety muted">
          Stop if you feel pain. This is general wellness guidance, not medical advice.
        </p>
      </section>
    </div>
  );
}
export default function Breaks({
  data,
  save,
  startBreak,
  now,
}: {
  data: Snapshot;
  save: (s: Settings) => Promise<void>;
  startBreak: (seconds: number, eye?: boolean) => void;
  now: number;
}) {
  const [s, set] = useState(data.settings);
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState('');
  const focus = isFocused(data.engine, now);
  const left = Math.max(0, Math.ceil((data.engine.nextDue.break - now) / 60000));
  const preset = (p: Settings['preset']) =>
    set({
      ...s,
      preset: p,
      interval: p === 'pomodoro' ? 25 : p === '202020' ? 20 : p === 'balanced' ? 45 : s.interval,
    });
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">REST. RESET. RETURN.</p>
        <h1>Breaks & focus</h1>
        <p>Pauses that fit around the things you need to do.</p>
      </div>
      <div className="two-col">
        <section className="card timer-card">
          <p className="eyebrow">
            {focus
              ? 'YOU HAVE SPACE TO FOCUS'
              : isQuiet(s, now)
                ? 'ENJOY YOUR QUIET HOURS'
                : 'YOUR NEXT LITTLE RESET'}
          </p>
          <div className="timer-display">
            {focus ? (
              <Moon size={55} />
            ) : (
              <>
                <strong>{left}</strong>
                <small>minutes to your next break</small>
              </>
            )}
          </div>
          <p className="muted">
            {focus
              ? 'All reminders are paused. Keep going at your pace.'
              : 'You can always pause sooner, or snooze later.'}
          </p>
          <div className="inline-controls">
            <select
              aria-label="Break length"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
            <button className="primary" onClick={() => startBreak(duration)}>
              <Coffee size={17} />
              Take a break
            </button>
          </div>
          <button className="text-button" onClick={() => startBreak(20, true)}>
            Try a 20-second eye rest
            <ArrowRight size={15} />
          </button>
        </section>
        <section className={`card focus-card ${focus ? 'focused' : ''}`}>
          <span className="stat-icon lavender">
            <Moon size={22} />
          </span>
          <h2>Important task mode</h2>
          <p className="muted">
            Classes, exams, calls, or deep work. All reminders wait until you’re ready.
          </p>
          {focus ? (
            <>
              <div className="focus-status">
                <BellOff size={18} />
                {data.engine.focusUntil === -1
                  ? 'Until you turn it off'
                  : `${Math.ceil((data.engine.focusUntil! - now) / 60000)} minutes remaining`}
              </div>
              <button className="primary" onClick={() => void window.screenwell.focus(null)}>
                I’m ready for reminders
              </button>
            </>
          ) : (
            <div className="focus-options">
              {[30, 60, 90, 0].map((m) => (
                <button
                  className="secondary"
                  key={m}
                  onClick={() => void window.screenwell.focus(m)}
                >
                  {m ? `${m} min` : 'Until I turn it off'}
                </button>
              ))}
            </div>
          )}
          <p className="small-print muted">
            Also available from the system tray. ScreenWell never locks your screen.
          </p>
        </section>
      </div>
      <section className="card space-top">
        <h2>Your reminder rhythm</h2>
        <div className="preset-grid">
          {(
            [
              ['balanced', 'Balanced', '45-minute study rhythm'],
              ['202020', '20-20-20', '20 minutes · 20 feet · 20 seconds'],
              ['pomodoro', 'Pomodoro', '25 minutes of focus · 5-minute break'],
              ['custom', 'Your own pace', 'Choose a rhythm that fits'],
            ] as const
          ).map(([p, t, d]) => (
            <button
              key={p}
              className={`choice ${s.preset === p ? 'selected' : ''}`}
              onClick={() => preset(p)}
            >
              <Timer size={18} />
              <strong>{t}</strong>
              <small>{d}</small>
            </button>
          ))}
        </div>
        <div className="form-row">
          <label>
            Break interval (minutes)
            <input
              type="number"
              min={1}
              max={240}
              value={s.interval}
              onChange={(e) => set({ ...s, interval: Number(e.target.value), preset: 'custom' })}
            />
          </label>
          <label>
            Reminder style
            <select
              value={s.style}
              onChange={(e) => set({ ...s, style: e.target.value as Settings['style'] })}
            >
              <option value="popup">Gentle pop-up</option>
              <option value="small">Small notification</option>
              <option value="fullscreen">Large in-app card</option>
            </select>
          </label>
        </div>
        <p className="small-print muted">
          Even the large card stays inside ScreenWell. Nothing takes over your screen.
        </p>
        <div className="reminder-toggles">
          {Object.entries(s.enabled).map(([type, on]) => (
            <Toggle
              key={type}
              label={labels[type as keyof typeof labels]}
              checked={on}
              onChange={(v) => set({ ...s, enabled: { ...s.enabled, [type]: v } })}
            />
          ))}
        </div>
        <button
          className="primary"
          onClick={() =>
            void save({
              ...data.settings,
              preset: s.preset,
              interval: s.interval,
              style: s.style,
              enabled: s.enabled,
            })
              .then(() => setStatus('Your rhythm is saved.'))
              .catch(() => setStatus('Please use a valid interval, then try again.'))
          }
        >
          Save rhythm
        </button>
        <span className="inline-status" role="status">
          {status}
        </span>
      </section>
      <div className="tip-line">
        <Mascot small />
        <p>
          <strong>A pause is always your choice.</strong>
          <br />
          Snooze, skip, or turn any reminder off for today. We’ll be here when you’re ready.
        </p>
      </div>
    </>
  );
}
