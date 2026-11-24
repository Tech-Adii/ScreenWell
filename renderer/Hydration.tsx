import { useState } from 'react';
import { Droplets, Plus, Check, Flame, Clock3 } from 'lucide-react';
import { Settings, Snapshot } from '../shared/types';
import { dayKey } from '../shared/defaults';
import { hydrationStreak } from '../data/insights';
import { Toggle } from './components';
import { CelebrationBurst } from './MotionGraphics';
export default function Hydration({
  data,
  save,
}: {
  data: Snapshot;
  save: (s: Settings) => Promise<void>;
}) {
  const today = data.events.filter((e) => e.day === dayKey() && e.type === 'water');
  const count = today.reduce((a, e) => a + e.value, 0);
  const goal = data.settings.waterGoal;
  const [s, set] = useState(data.settings);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [celebration, setCelebration] = useState(0);
  const drink = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await window.screenwell.water();
      setCelebration((n) => n + 1);
      setStatus('A little sip, a little care. Logged.');
    } catch {
      setStatus('Couldn’t log this glass. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">A LITTLE SIP OF CARE</p>
        <h1>Stay in your flow</h1>
        <p>Make room for water, one glass at a time.</p>
      </div>
      <div className="two-col">
        <section className="card water-card">
          <p className="eyebrow">TODAY’S HYDRATION</p>
          <div className="water-illustration" aria-label={`${count} of ${goal} glasses`} role="img">
            {celebration > 0 && <CelebrationBurst key={celebration} />}
            <div className="water-glass">
              <div
                className="water-fill"
                style={{ height: `${Math.min(100, (count / goal) * 100)}%` }}
              >
                <span />
                <span />
              </div>
              <Droplets size={39} />
            </div>
            <span className="water-spark spark-one">✦</span>
            <span className="water-spark spark-two">✧</span>
          </div>
          <h2 className="water-count">
            {count}
            <span> / {goal} glasses</span>
          </h2>
          <p className="muted">
            {count >= goal
              ? 'You made room for your water goal today. Nicely done.'
              : 'Little sips add up. Follow what feels right for you.'}
          </p>
          <button className="primary" onClick={() => void drink()} disabled={busy}>
            <Plus size={19} />I drank water
          </button>
          <p className="status-text" role="status">
            {status}
          </p>
          <div className="glass-dots" aria-hidden="true">
            {Array.from({ length: goal }, (_, i) => (
              <span key={i} className={i < count ? 'filled' : ''}>
                <Droplets size={17} />
              </span>
            ))}
          </div>
        </section>
        <div className="stack">
          <section className="card">
            <span className="stat-icon peach">
              <Flame size={22} />
            </span>
            <h2>{hydrationStreak(data.events, goal)} day hydration streak</h2>
            <p className="muted">
              A day counts when you reach your personal goal. An unfinished today gives you room to
              keep going.
            </p>
            <p className="small-print muted">
              Your goal is a habit target, not a recommended medical intake. Your needs may vary.
            </p>
          </section>
          <section className="card water-log">
            <h2>Today’s little sips</h2>
            {today.length ? (
              <ul>
                {today
                  .slice(-5)
                  .reverse()
                  .map((e) => (
                    <li key={e.id}>
                      <span>
                        <Droplets size={16} />
                        One glass
                      </span>
                      <time>
                        {new Date(e.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <Check size={15} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="muted">
                Your first glass is a fresh start. Log it whenever you’re ready.
              </p>
            )}
          </section>
        </div>
      </div>
      <section className="card space-top">
        <div className="card-heading">
          <h2>
            <Clock3 size={19} /> Your water rhythm
          </h2>
        </div>
        <div className="form-row">
          <label>
            Daily goal (glasses)
            <input
              type="number"
              min={1}
              max={30}
              value={s.waterGoal}
              onChange={(e) => set({ ...s, waterGoal: Number(e.target.value) })}
            />
          </label>
          <label>
            Remind me every (minutes)
            <input
              type="number"
              min={5}
              max={240}
              value={s.waterInterval}
              onChange={(e) => set({ ...s, waterInterval: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Active from
            <input
              type="time"
              value={s.activeStart}
              onChange={(e) => set({ ...s, activeStart: e.target.value })}
            />
          </label>
          <label>
            Until
            <input
              type="time"
              value={s.activeEnd}
              onChange={(e) => set({ ...s, activeEnd: e.target.value })}
            />
          </label>
        </div>
        <Toggle
          label="Gentle water reminders"
          description="Only during active hours. Focus mode and quiet hours always come first."
          checked={s.enabled.water}
          onChange={(v) => set({ ...s, enabled: { ...s.enabled, water: v } })}
        />
        <button
          className="primary space-top"
          onClick={() =>
            void save({
              ...data.settings,
              waterGoal: s.waterGoal,
              waterInterval: s.waterInterval,
              activeStart: s.activeStart,
              activeEnd: s.activeEnd,
              enabled: { ...data.settings.enabled, water: s.enabled.water },
            })
              .then(() => setStatus('Your water rhythm is saved.'))
              .catch(() => setStatus('Check your goal and reminder interval, then try again.'))
          }
        >
          Save water rhythm
        </button>
      </section>
    </>
  );
}
