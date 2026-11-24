import { useState } from 'react';
import { ArrowRight, CameraOff, ShieldCheck, Check } from 'lucide-react';
import { Settings } from '../shared/types';
import { greeting } from '../shared/defaults';
import { Brand, Mascot, Toggle } from './components';
export default function Profile({
  settings,
  first,
  save,
  remove,
}: {
  settings: Settings;
  first?: boolean;
  save: (s: Settings) => Promise<void>;
  remove: () => void;
}) {
  const [s, set] = useState(settings);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => set({ ...s, [k]: v });
  const submit = async () => {
    if (!s.name.trim()) {
      setError('Tell us what you’d like to be called.');
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      await save({
        ...settings,
        name: s.name.trim(),
        onboarded: true,
        ageGroup: s.ageGroup,
        course: s.course,
        screenHours: s.screenHours,
        glasses: s.glasses,
        device: s.device,
        style: s.style,
        interval: s.interval,
        quietStart: s.quietStart,
        quietEnd: s.quietEnd,
        quietEnabled: s.quietEnabled,
      });
      setError('');
    } catch {
      setError('Couldn’t save your preferences. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const identity = (
    <>
      <div className="form-row">
        <label>
          Your name <span className="required">*</span>
          <input
            autoFocus={first}
            maxLength={50}
            value={s.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="What should we call you?"
            autoComplete="given-name"
          />
        </label>
        <label>
          Age group <span className="optional">optional</span>
          <select value={s.ageGroup} onChange={(e) => update('ageGroup', e.target.value)}>
            <option value="">Prefer not to say</option>
            <option>Under 18</option>
            <option>18–24</option>
            <option>25–34</option>
            <option>35+</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Year / branch <span className="optional">optional</span>
          <input
            maxLength={100}
            value={s.course}
            placeholder="e.g. Year 2, Computer Science"
            onChange={(e) => update('course', e.target.value)}
          />
        </label>
        <label>
          Daily screen time <span className="optional">optional</span>
          <select value={s.screenHours} onChange={(e) => update('screenHours', e.target.value)}>
            <option value="">Choose an estimate</option>
            <option>Under 2 hours</option>
            <option>2–4 hours</option>
            <option>4–6 hours</option>
            <option>6+ hours</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Do you wear glasses?
          <select value={s.glasses} onChange={(e) => update('glasses', e.target.value)}>
            <option value="">Prefer not to say</option>
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
        <label>
          Main device
          <select value={s.device} onChange={(e) => update('device', e.target.value)}>
            <option>Laptop</option>
            <option>Desktop PC</option>
            <option>External monitor</option>
          </select>
        </label>
      </div>
    </>
  );
  const reminders = (
    <>
      <label className="field-label">How should we remind you?</label>
      <div className="choice-grid">
        {(
          [
            ['popup', 'Gentle pop-up', 'A small card with snooze.'],
            ['small', 'Small notification', 'Keep it subtle.'],
            ['fullscreen', 'Large in-app card', 'More room for a pause.'],
          ] as const
        ).map(([v, t, d]) => (
          <button
            type="button"
            className={`choice ${s.style === v ? 'selected' : ''}`}
            key={v}
            onClick={() => update('style', v)}
          >
            <strong>{t}</strong>
            <small>{d}</small>
            {s.style === v && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="form-row">
        <label>
          Break interval
          <select
            value={[25, 45, 90].includes(s.interval) ? String(s.interval) : 'custom'}
            onChange={(e) => {
              update('interval', e.target.value === 'custom' ? 30 : Number(e.target.value));
            }}
          >
            <option value="25">20–30 minutes (25)</option>
            <option value="45">45–60 minutes (45)</option>
            <option value="90">90 minutes</option>
            <option value="custom">My own timing</option>
          </select>
        </label>
        <label>
          Minutes
          <input
            type="number"
            min={1}
            max={240}
            value={s.interval}
            onChange={(e) => update('interval', Number(e.target.value))}
          />
        </label>
      </div>
      <Toggle
        checked={s.quietEnabled}
        onChange={(v) => update('quietEnabled', v)}
        label="Quiet hours"
        description="A little peace at the end of the day."
      />
      <div className="form-row">
        <label>
          Quiet from
          <input
            type="time"
            value={s.quietStart}
            onChange={(e) => update('quietStart', e.target.value)}
          />
        </label>
        <label>
          Until
          <input
            type="time"
            value={s.quietEnd}
            onChange={(e) => update('quietEnd', e.target.value)}
          />
        </label>
      </div>
    </>
  );
  const privacy = (
    <>
      <div className="privacy-explainer">
        <ShieldCheck size={30} />
        <h2>Your space. Your data.</h2>
        <p>Video stays on your computer. Nothing is saved or sent anywhere.</p>
        <p>
          ScreenWell works with timers alone. If you choose to use the camera later, only blink
          counts and posture scores are saved. You can turn it off at any time.
        </p>
      </div>
      <div className="camera-default">
        <CameraOff size={21} />
        <span>
          <strong>Camera is off by default</strong>
          <small>You can opt in from the Camera page whenever you’re ready.</small>
        </span>
      </div>
      <p className="muted safety">
        ScreenWell offers habit support. It is not a medical device and does not diagnose or treat
        conditions.
      </p>
    </>
  );
  return (
    <div className={first ? 'onboarding' : 'profile-view'}>
      {first && <Brand />}
      {first ? (
        <div className="onboarding-layout">
          <aside>
            <p className="eyebrow">{greeting().toUpperCase()} · WELCOME TO A CALMER WORKDAY</p>
            <h1>
              Small pauses.
              <br />A little more you.
            </h1>
            <p>
              Rest your eyes. Reset your posture.
              <br />
              We’ll fit around your day.
            </p>
            <Mascot />
            <span className="offline-pill">
              <ShieldCheck size={14} />
              100% offline. Always yours.
            </span>
          </aside>
          <section className="onboarding-card">
            <div className="stepper">
              {['About you', 'Your rhythm', 'Your privacy'].map((t, i) => (
                <span key={t} className={i <= step ? 'active' : ''}>
                  <b>{i + 1}</b>
                  {t}
                </span>
              ))}
            </div>
            <h2>
              {
                [
                  'Let’s make this feel like you.',
                  'Find your own rhythm.',
                  'A companion you can trust.',
                ][step]
              }
            </h2>
            <p className="muted">
              {
                [
                  'Just your name is required. Everything else is up to you.',
                  'Every reminder can be snoozed, skipped, or turned off.',
                  'No accounts. No uploads. No tracking.',
                ][step]
              }
            </p>
            <div className="step-content">{[identity, reminders, privacy][step]}</div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="form-actions">
              {step > 0 && (
                <button className="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </button>
              )}
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  if (step === 0 && !s.name.trim())
                    setError('Tell us what you’d like to be called.');
                  else if (step < 2) {
                    setError('');
                    setStep(step + 1);
                  } else void submit();
                }}
              >
                {step === 2 ? 'Make room for a pause' : 'Continue'}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="page-title">
            <p className="eyebrow">MAKE YOURSELF AT HOME</p>
            <h1>Your profile</h1>
            <p>Little preferences that make ScreenWell yours.</p>
          </div>
          <section className="card form-card">
            <h2>About you</h2>
            {identity}
            <hr />
            <h2>Your rhythm</h2>
            {reminders}
            <hr />
            {privacy}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" onClick={() => void submit()} disabled={busy}>
              Save profile
              <Check size={17} />
            </button>
          </section>
          <section className="card danger-zone">
            <h2>Your data, your choice</h2>
            <p>Delete your profile, history, feedback, and calibration from this computer.</p>
            <button className="danger-button" onClick={remove}>
              Delete all my data
            </button>
          </section>
        </>
      )}
    </div>
  );
}
