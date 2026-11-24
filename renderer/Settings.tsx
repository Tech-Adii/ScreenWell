import { useState } from 'react';
import { Settings as SettingsType } from '../shared/types';
import { Toggle } from './components';
import { AppearanceStudio, appearanceKeys } from './AppearanceStudio';
import { speakOffline, stopSpeech } from './speech';
import { useEffect } from 'react';
export default function Settings({
  settings,
  save,
}: {
  settings: SettingsType;
  save: (s: SettingsType) => Promise<void>;
}) {
  const [s, set] = useState(settings);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => () => stopSpeech(), []);
  useEffect(() => {
    if (!s.voice) stopSpeech();
  }, [s.voice]);
  const update = <K extends keyof SettingsType>(k: K, v: SettingsType[K]) => set({ ...s, [k]: v });
  const persist = async (appearanceOnly = false) => {
    setBusy(true);
    try {
      const keys = appearanceOnly
        ? appearanceKeys
        : ([...appearanceKeys, 'startAtLogin', 'sound', 'voice', 'autoDelay'] as const);
      const changes = Object.fromEntries(keys.map((key) => [key, s[key]]));
      await save({ ...settings, ...changes });
      setStatus(appearanceOnly ? 'Your colours and motion are ready.' : 'Preferences saved.');
    } catch {
      setStatus('Couldn’t save. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">YOUR DAY, YOUR WAY</p>
        <h1>Settings</h1>
        <p>Choose what feels comfortable.</p>
      </div>
      <AppearanceStudio draft={s} onChange={set} apply={() => void persist(true)} busy={busy} />
      <div className="settings-grid space-top">
        <section className="card">
          <h2>Comfort & accessibility</h2>
          <label>
            Text size
            <select
              value={s.fontScale}
              onChange={(e) => update('fontScale', Number(e.target.value))}
            >
              <option value={1}>Comfortable</option>
              <option value={1.1}>Large</option>
              <option value={1.2}>Extra large</option>
            </select>
          </label>
          <Toggle
            label="High contrast"
            checked={s.contrast}
            onChange={(v) => update('contrast', v)}
          />
          <Toggle
            label="Reduce motion"
            description="Keep animations still."
            checked={s.reducedMotion}
            onChange={(v) => update('reducedMotion', v)}
          />
        </section>
        <section className="card">
          <h2>Around your work</h2>
          {window.screenwell.platform !== 'linux' && (
            <Toggle
              label={
                window.screenwell.platform === 'win32' ? 'Start with Windows' : 'Start at login'
              }
              description="Available in installed builds."
              checked={s.startAtLogin}
              onChange={(v) => update('startAtLogin', v)}
            />
          )}
          <Toggle
            label="Gentle reminder sound"
            checked={s.sound}
            onChange={(v) => update('sound', v)}
          />
          <Toggle
            label="Offline voice guidance"
            description="Speak reminders and exercise steps using an installed offline English system voice. Save to enable."
            checked={s.voice}
            onChange={(v) => update('voice', v)}
          />
          <div className="voice-controls">
            <button
              className="secondary"
              disabled={!s.voice}
              onClick={() =>
                speakOffline(
                  'Please sit straight in a comfortable position. Relax your shoulders. Time for a gentle screen break.',
                  setStatus,
                )
              }
            >
              Test voice
            </button>
            <button className="text-button" onClick={stopSpeech}>
              Stop speaking
            </button>
          </div>
          <Toggle
            label="Wait for a pause in typing"
            description="Hold reminders briefly while you type in ScreenWell."
            checked={s.autoDelay}
            onChange={(v) => update('autoDelay', v)}
          />
          <p className="muted small-print">
            For classes, calls, exams, or another full-screen app, use Important task mode.
            ScreenWell does not monitor other apps or your keystrokes.
          </p>
        </section>
      </div>
      <p role="status">{status}</p>
      <button
        className="primary"
        disabled={
          busy ||
          !/^#[0-9a-f]{6}$/i.test(s.primaryColor) ||
          !/^#[0-9a-f]{6}$/i.test(s.companionColor)
        }
        onClick={() => void persist()}
      >
        Save preferences
      </button>
    </>
  );
}
