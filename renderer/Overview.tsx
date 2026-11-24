import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Palette,
  Play,
  Coffee,
  Droplets,
  Wind,
  Eye,
  ScanFace,
  Timer,
  ShieldCheck,
  Sparkles,
  Activity,
  Check,
  Leaf,
  Pause,
  Clock3,
} from 'lucide-react';
import { Snapshot, VisionMetrics, ReminderType } from '../shared/types';
import { dayKey, greeting, labels } from '../shared/defaults';
import { focusMinutes, formatCountdown, nextCare, careStatus } from '../shared/wellness';
import { isFocused, intervalMs } from '../engine/scheduler';
import { dailySummary, weekSummary, weeklyInsight } from '../data/insights';
import DailyPlan from './DailyPlan';
import { hasStudy, studyRemaining } from '../shared/study';
import { LiveMonitor } from './LiveMonitor';
type Route =
  | 'Study session'
  | 'Settings'
  | 'Breaks & focus'
  | 'Camera'
  | 'Your progress'
  | 'Hydration'
  | 'Move & reset';
const careIcons = {
  break: Coffee,
  water: Droplets,
  eyes: Eye,
  stretch: Activity,
  posture: ScanFace,
};
function FocusObservatory({
  time,
  label,
  caption,
  progress,
}: {
  time: string;
  label: string;
  caption: string;
  progress: number;
}) {
  const offset = 741 * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="focus-observatory" aria-label={`${label}: ${time}`}>
      <svg className="observatory-lines" viewBox="0 0 280 280" aria-hidden="true">
        <circle
          className="observatory-track"
          cx="140"
          cy="140"
          r="118"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="140"
          cy="140"
          r="118"
          className="observatory-progress"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="741"
          strokeDashoffset={offset}
          transform="rotate(-90 140 140)"
        />
        <g className="orbit-rotor observatory-orbit">
          <circle
            cx="140"
            cy="140"
            r="133"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".26"
            strokeDasharray="1 9.45"
          />
          <circle cx="140" cy="7" r="4" fill="currentColor" />
        </g>
      </svg>
      <div className="focus-sphere">
        <span className="sphere-kicker">
          <i />
          {label}
        </span>
        <strong>{time}</strong>
        <span className="sphere-caption">{caption}</span>
      </div>
    </div>
  );
}
export default function Overview({
  data,
  now,
  metrics,
  cameraOn,
  navigate,
  focus,
  breathe,
  eyeRest,
  notify,
}: {
  data: Snapshot;
  now: number;
  metrics: VisionMetrics;
  cameraOn: boolean;
  navigate: (page: Route) => void;
  focus: (minutes: number | null) => Promise<void>;
  breathe: () => void;
  eyeRest: () => void;
  notify: (message: string) => void;
}) {
  const day = dayKey(now),
    { events, settings, engine } = data;
  const today = useMemo(() => dailySummary(events, settings, day), [events, settings, day]);
  const week = useMemo(() => weekSummary(events, settings, now), [events, settings, day]);
  const minutes = useMemo(() => focusMinutes(data, now), [events, day]);
  const breathingMoments = useMemo(
    () => events.filter((event) => event.day === day && event.type === 'breathing-complete').length,
    [events, day],
  );
  const insight = useMemo(() => weeklyInsight(events), [events]);
  const [busy, setBusy] = useState(false),
    [duration, setDuration] = useState(25);
  const focused = isFocused(engine, now),
    session = hasStudy(data.study) ? data.study : null,
    step = session?.steps[session.index],
    upcoming = nextCare(data, now),
    next = upcoming[0];
  const focusTime =
    engine.focusUntil === -1 ? '∞' : formatCountdown((engine.focusUntil ?? now) - now);
  const time = session
    ? formatCountdown(studyRemaining(session, now))
    : focused
      ? focusTime
      : next
        ? formatCountdown(next.at - now)
        : '—';
  const progress =
    session && step
      ? 1 - studyRemaining(session, now) / (step.seconds * 1000)
      : focused
        ? engine.focusUntil === -1
          ? 1
          : 1 -
            ((engine.focusUntil ?? now) - now) /
              Math.max(1, (engine.focusUntil ?? now) - (engine.focusStarted ?? now))
        : next
          ? 1 - (next.at - now) / intervalMs(next.type, settings)
          : 0;
  const runFocus = async (value: number | null) => {
    if (busy) return;
    setBusy(true);
    try {
      await focus(value);
    } finally {
      setBusy(false);
    }
  };
  const water = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await window.screenwell.water();
      notify('One glass, a little care. Logged.');
    } catch {
      notify('Couldn’t log your water. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const weekBreaks = week.reduce((sum, item) => sum + item.breaks, 0),
    weekWater = week.reduce((sum, item) => sum + item.water, 0),
    barMax = Math.max(1, ...week.map((item) => Math.max(item.breaks, item.water)));
  return (
    <div className="overview-v2">
      <div className="welcome-row">
        <div>
          <span className="welcome-date">
            <i />
            {new Intl.DateTimeFormat('en', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date(now))}
          </span>
          <h1>
            {greeting()}, {settings.name}
            <span className="welcome-spark">✦</span>
          </h1>
        </div>
        <button className="secondary customize-button" onClick={() => navigate('Settings')}>
          <Palette size={16} />
          Make it yours
          <ArrowUpRight size={15} />
        </button>
      </div>
      <section className="dashboard-launch card" aria-label="Session quick start">
        <div>
          <span className="section-kicker">
            <ShieldCheck size={14} /> YOUR STUDY COMPANION
          </span>
          <h2>
            {hasStudy(data.study)
              ? 'Your session, one click away.'
              : 'Start here. We’ll plan the breaks.'}
          </h2>
          <p>
            {hasStudy(data.study)
              ? `${data.study.status === 'running' ? 'Session running' : data.study.status === 'paused' ? 'Session paused' : 'Finish your camera setup'} · ${Math.floor(data.study.completedStudySeconds / 60)} of ${data.study.config.studyMinutes} study minutes completed.`
              : 'Choose your study time, optional camera checks and movement schedule. Minimize the app and keep going.'}
          </p>
        </div>
        <div className="dashboard-launch-actions">
          <button className="primary" onClick={() => navigate('Study session')}>
            <Play size={16} />
            {hasStudy(data.study) ? 'Open my session' : 'Plan a study session'}
            <ArrowRight size={16} />
          </button>
          <button className="text-button" onClick={() => navigate('Camera')}>
            <ScanFace size={15} /> Camera & calibration
          </button>
        </div>
      </section>
      {cameraOn && <LiveMonitor data={data} />}
      <section
        className={`hero focus-hero ${focused ? 'session-active' : ''}`}
        aria-label="Focus and care"
      >
        <div className="focus-hero-copy">
          <span className="hero-status">
            <i />
            {session ? 'GUIDED STUDY' : focused ? 'FOCUS IN PROGRESS' : 'QUICK FOCUS'}
          </span>
          <h2>
            {session ? 'Your study timer' : focused ? 'Time to focus' : 'Set your focus timer'}
          </h2>
          <p>
            {session
              ? 'Open your session to see the next step and manage camera checks.'
              : focused
                ? 'Reminders resume when your focus timer ends.'
                : 'Choose a duration to pause reminders while you work.'}
          </p>
          {hasStudy(data.study) ? (
            <div className="hero-focus-actions">
              <button className="primary" onClick={() => navigate('Study session')}>
                <Play size={15} />
                Return to my study session
                <ArrowRight size={15} />
              </button>
            </div>
          ) : focused ? (
            <div className="focus-session-controls">
              <span className="session-indicator">
                <Pause size={13} />
                All reminders paused
              </span>
              <button className="primary" disabled={busy} onClick={() => void runFocus(null)}>
                <Check size={16} />
                Finish focus
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="focus-lengths" role="group" aria-label="Quick focus duration">
                {[25, 45, 60].map((value) => (
                  <button
                    aria-pressed={duration === value}
                    key={value}
                    onClick={() => setDuration(value)}
                  >
                    {value} min
                  </button>
                ))}
              </div>
              <div className="hero-focus-actions">
                <button className="primary" disabled={busy} onClick={() => void runFocus(duration)}>
                  <Play size={15} />
                  Start {duration}-minute focus
                  <ArrowUpRight size={16} />
                </button>
                <button className="hero-breathe-button" onClick={breathe}>
                  <Wind size={17} />
                  Take a breath
                </button>
              </div>
            </>
          )}
        </div>
        <FocusObservatory
          time={time}
          label={
            session
              ? session.status === 'paused'
                ? 'SESSION PAUSED'
                : session.status === 'preparing'
                  ? 'GETTING READY'
                  : step?.kind === 'study'
                    ? 'STUDY TIME'
                    : 'BREAK TIME'
              : focused
                ? 'FOCUS TIME'
                : next
                  ? 'NEXT MOMENT'
                  : 'TAKE YOUR TIME'
          }
          caption={
            session
              ? 'Your guided session · open it above'
              : focused
                ? 'Until reminders resume'
                : next
                  ? labels[next.type]
                  : 'Your reminders are resting'
          }
          progress={progress}
        />
      </section>
      <div className="overview-section-label">
        <span>YOUR DAY, AT A GLANCE</span>
        <span className="live-data-label">
          <i />
          {data.demo ? 'Sample activity' : 'Your real activity'}
        </span>
      </div>
      <div className="stats-grid overview-stats">
        <section className="stat-card">
          <div className="stat-topline">
            <span className="stat-icon green">
              <Timer size={19} />
            </span>
            <span>Today</span>
          </div>
          <p>Focus time</p>
          <strong>
            {Math.round(minutes)}
            <span> minutes</span>
          </strong>
          <small>
            {focused ? 'A focus session is in progress.' : 'From completed focus sessions.'}
          </small>
        </section>
        <section className="stat-card">
          <div className="stat-topline">
            <span className="stat-icon blue">
              <Droplets size={19} />
            </span>
            <button
              className="stat-add"
              aria-label="Log a glass of water"
              disabled={busy}
              onClick={() => void water()}
            >
              +
            </button>
          </div>
          <p>Little sips</p>
          <strong>
            {today.water}
            <span> / {settings.waterGoal} glasses</span>
          </strong>
          <div className="mini-bar">
            <i style={{ width: `${Math.min(100, (today.water / settings.waterGoal) * 100)}%` }} />
          </div>
        </section>
        <section className="stat-card">
          <div className="stat-topline">
            <span className="stat-icon lavender">
              <Coffee size={19} />
            </span>
            <span>Today</span>
          </div>
          <p>Mindful pauses</p>
          <strong>
            {today.breaks}
            <span> completed</span>
          </strong>
          <small>Room to reset. Room to return.</small>
        </section>
        <section className="stat-card">
          <div className="stat-topline">
            <span className="stat-icon peach">
              <ScanFace size={19} />
            </span>
            <button className="stat-detail-link" onClick={() => navigate('Camera')}>
              View
              <ArrowUpRight size={12} />
            </button>
          </div>
          <p>Eye & posture care</p>
          <strong className="stat-words">
            {cameraOn
              ? metrics.posture !== null
                ? `${metrics.posture} / 100`
                : 'Observing…'
              : 'Camera resting'}
          </strong>
          <small>{cameraOn ? metrics.message : 'Optional. Always your choice.'}</small>
        </section>
      </div>
      <div className="overview-main-grid">
        <DailyPlan
          plan={data.plan}
          completedMinutes={minutes}
          startFocus={() => void runFocus(duration)}
        />
        <section className="card little-reset-card">
          <div className="premium-card-heading">
            <div>
              <span className="section-kicker">
                <Wind size={13} />
                LESS RUSH. MORE ROOM.
              </span>
              <h2>A softer kind of reset.</h2>
            </div>
            <span className="reset-duration">1 MIN</span>
          </div>
          <div className="reset-preview" aria-hidden="true">
            <span />
            <span />
            <span />
            <Wind size={35} />
            <i />
          </div>
          <p>
            {breathingMoments
              ? `${breathingMoments} breathing ${breathingMoments === 1 ? 'moment' : 'moments'} made today.`
              : 'Step out of the rush.'}
            <br />
            {breathingMoments
              ? 'A little space, whenever you need it.'
              : 'Let one slow breath become the next.'}
          </p>
          <button className="secondary" onClick={breathe}>
            Try a breathing reset
            <ArrowUpRight size={16} />
          </button>
          <div className="reset-alternatives">
            <button onClick={eyeRest}>
              <Eye size={14} />
              20-second eye rest
            </button>
            <button onClick={() => navigate('Move & reset')}>
              <Activity size={14} />A little movement
            </button>
          </div>
        </section>
      </div>
      <div className="overview-bottom-grid">
        <section className="card week-rhythm-card">
          <div className="premium-card-heading">
            <div>
              <span className="section-kicker">
                <Activity size={13} />
                SMALL THINGS, OVER TIME
              </span>
              <h2>A week of showing up.</h2>
            </div>
            <button className="text-button" onClick={() => navigate('Your progress')}>
              Your progress
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="week-summary-line">
            <strong>
              {weekBreaks}
              <span> pauses</span>
            </strong>
            <i />
            <strong>
              {weekWater}
              <span> glasses</span>
            </strong>
            <span className="week-legend">
              <i />
              Pauses
              <i />
              Water
            </span>
          </div>
          <div
            className="week-bars"
            role="img"
            aria-label={`Last seven days: ${weekBreaks} completed pauses and ${weekWater} logged glasses of water`}
          >
            {week.map((item, i) => (
              <div className={i === 6 ? 'today' : ''} key={item.day}>
                <div
                  className="week-bar-pair"
                  title={`${item.day}: ${item.breaks} pauses, ${item.water} glasses`}
                >
                  <span
                    style={{
                      height: item.breaks ? `${Math.max(5, (item.breaks / barMax) * 100)}%` : '0px',
                    }}
                  />
                  <span
                    style={{
                      height: item.water ? `${Math.max(5, (item.water / barMax) * 100)}%` : '0px',
                    }}
                  />
                </div>
                <small>
                  {new Date(item.day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                </small>
                {i === 6 && <i />}
              </div>
            ))}
          </div>
          <p className="week-insight">
            <Sparkles size={15} />
            {insight}
          </p>
        </section>
        <section className="card next-care-card">
          <div className="premium-card-heading">
            <div>
              <span className="section-kicker">
                <Clock3 size={13} />
                YOUR GENTLE RHYTHM
              </span>
              <h2>Up next, a little care.</h2>
            </div>
          </div>
          <p className="care-status">{careStatus(data, now)}</p>
          <div className="care-queue">
            {upcoming.slice(0, 3).map((item: { type: ReminderType; at: number }) => {
              const Icon = careIcons[item.type];
              return (
                <div key={session ? `${item.type}-${item.at}` : item.type}>
                  <span>
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{labels[item.type]}</strong>
                    <small>
                      {item.type === 'water'
                        ? 'A little sip, whenever you’re ready.'
                        : item.type === 'eyes'
                          ? 'Look beyond the screen for a moment.'
                          : 'Room to pause, without the pressure.'}
                    </small>
                  </div>
                  <time>
                    {item.at <= now ? 'Ready' : `in ${Math.ceil((item.at - now) / 60000)} min`}
                  </time>
                </div>
              );
            })}
            {!upcoming.length && (
              <div className="care-queue-rest">
                <span>{focused ? <Timer size={23} /> : <Leaf size={23} />}</span>
                <strong>
                  {focused ? 'Some space for your attention.' : 'A quiet moment, just for you.'}
                </strong>
                <small>
                  {focused
                    ? 'Your reminders return after focus mode.'
                    : 'Your schedule will resume when it’s time.'}
                </small>
              </div>
            )}
          </div>
          <button className="text-button" onClick={() => navigate('Breaks & focus')}>
            Adjust your rhythm
            <ArrowUpRight size={14} />
          </button>
        </section>
      </div>
      <footer className="overview-footer">
        <span>
          <Leaf size={13} />A LITTLE PAUSE. A BETTER DAY.
        </span>
        <span>
          <ShieldCheck size={12} />
          Your space stays on this device.
        </span>
      </footer>
    </div>
  );
}
