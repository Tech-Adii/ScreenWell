import { useEffect, useState } from 'react';
import { Coffee, Droplets, Eye, Activity, X, Clock3, ScanFace } from 'lucide-react';
import { Snapshot, ReminderAction } from '../shared/types';
import { defaults, labels } from '../shared/defaults';
import { useAppearance } from './useAppearance';
import ExerciseArt from './ExerciseArt';
import { formatCountdown } from '../shared/wellness';
import { LiveMonitor } from './LiveMonitor';
import { studySettings } from '../shared/study';
import ReminderGuide from './ReminderGuide';
import { reminderSpeech } from '../shared/voice';
import AwayRestReview from './AwayRestReview';
function SessionReminderArt({ kind }: { kind: string }) {
  return (
    <div className={`session-reminder-art art-${kind}`} aria-hidden="true">
      {kind === 'water' ? (
        <>
          <span className="sip-drop drop-one" />
          <span className="sip-drop drop-two" />
          <div className="sip-cup">
            <i />
            <Droplets size={27} />
          </div>
          <span className="sip-spark">✦</span>
        </>
      ) : kind === 'exercise' ? (
        <ExerciseArt motion="roll" />
      ) : kind === 'finished' ? (
        <div className="session-finish-art">
          <Coffee size={37} />
          <i />
        </div>
      ) : (
        <div className="rest-eye-art">
          <Eye size={58} />
          <span />
          <i />
        </div>
      )}
    </div>
  );
}
export function ReminderCard({
  data,
  onUpdate,
}: {
  data: Snapshot;
  onUpdate: (next: Snapshot) => void;
}) {
  const [snooze, setSnooze] = useState<5 | 10 | 15>(5);
  const [voiceStatus, setVoiceStatus] = useState('');
  const r = data.engine.pending;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (r?.source !== 'session') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [r?.id]);
  if (!r) return null;
  const action = (choice: ReminderAction) =>
    void window.screenwell.reminder(choice, r.id).then(onUpdate);
  const session = r.source === 'session',
    kind =
      r.reason === 'study-water'
        ? 'water'
        : r.reason === 'study-exercise'
          ? 'exercise'
          : r.reason === 'study-finished'
            ? 'finished'
            : 'rest';
  const Icon = { break: Coffee, water: Droplets, eyes: Eye, stretch: Activity, posture: ScanFace }[
    r.type
  ];
  const title = session
    ? {
        water: 'A little water, a little care.',
        exercise: 'It’s time for a little exercise.',
        finished: 'Your study session is complete.',
        rest: 'Time for an eye break.',
      }[kind]
    : r.reason === 'distance'
      ? 'Move back a little'
      : r.type === 'eyes'
        ? 'Time for an eye break.'
        : labels[r.type];
  const copy = session
    ? {
        water:
          'Take a comfortable sip of water. Your rest timer has finished, and your plan is ready for the next step.',
        exercise: `You’ve completed another ${data.study?.config.exerciseEveryMinutes ?? 60} minutes of study. Step away for a short walk or follow this gentle movement break.`,
        finished:
          'Your planned study time is up. Step away from the screen and take a little time for yourself.',
        rest: `Stop looking at the screen. Look at something in the distance for ${data.study?.config.restSeconds ?? 30} seconds.`,
      }[kind]
    : r.reason === 'distance'
      ? `You’ve been closer than your calibrated position for ${studySettings(data.settings, data.study).distanceHoldSeconds} seconds. Gently sit back and give yourself a little more space.`
      : {
          break: 'A small pause may help you return with a little more ease.',
          water: 'If it feels right, take a sip. Your work can wait a moment.',
          eyes:
            r.source === 'vision'
              ? 'Remember to blink 👀. Look around for a moment.'
              : 'Look at something about 20 feet away. Give your eyes 20 quiet seconds.',
          stretch:
            'You’ve reached your scheduled movement break. Step away for a short walk, or try these movements.',
          posture:
            r.source === 'vision'
              ? 'Your posture score has stayed below 80. Please sit straight in a comfortable position, relax your shoulders and keep your feet supported.'
              : 'Feet comfortable? Shoulders relaxed? Take a moment to check in.',
        }[r.type];
  return (
    <section
      className={`reminder-card ${data.settings.style} ${session ? 'session-reminder' : ''}`}
      role="region"
      aria-label={title}
    >
      <button
        className="dismiss-reminder"
        aria-label="Dismiss reminder"
        onClick={() => action('skip')}
      >
        <X size={18} />
      </button>
      <div className="reminder-body">
        {session ? (
          <SessionReminderArt kind={kind} />
        ) : (
          <span className="stat-icon green">
            <Icon size={23} />
          </span>
        )}
        <p className="eyebrow">A LITTLE CARE, WHEN YOU’RE READY</p>
        <h2>{title}</h2>
        <p>{copy}</p>
        {session && data.study?.awayRest && <AwayRestReview session={data.study} />}
        <div className="voice-controls">
          <button
            className="text-button"
            onClick={() =>
              void window.screenwell
                .snapshot()
                .then((s) =>
                  window.screenwell.settings({ ...s.settings, voice: !s.settings.voice }),
                )
                .catch(() => setVoiceStatus('Could not change voice settings. Try again.'))
            }
          >
            {data.settings.voice ? 'Mute voice' : 'Enable voice guidance'}
          </button>
          {data.settings.voice && (
            <>
              <button
                className="text-button"
                onClick={() =>
                  void window.screenwell
                    .speak(reminderSpeech(r))
                    .catch(() => setVoiceStatus('Could not play voice.'))
                }
              >
                Replay reminder
              </button>
              <button className="text-button" onClick={() => void window.screenwell.speak(null)}>
                Stop speaking
              </button>
            </>
          )}
        </div>
        <small className="voice-caption">
          {voiceStatus ||
            'Voice uses an installed offline English system voice. Written steps are always available.'}
        </small>
        {(r.type === 'eyes' || r.type === 'stretch') && (
          <ReminderGuide key={r.id} eyes={r.type === 'eyes'} voice={data.settings.voice} />
        )}
        {r.source === 'vision' && <LiveMonitor data={data} compact />}
        {data.notificationDelivery && (
          <p
            className={`delivery-note ${data.notificationDelivery.native === 'blocked' ? 'blocked' : ''}`}
            role="status"
          >
            {data.notificationDelivery.message}
          </p>
        )}
        {session && data.study?.status === 'running' && kind !== 'water' && kind !== 'finished' && (
          <div className="session-reminder-clock">
            <Clock3 size={15} />
            {formatCountdown((data.study.deadline ?? now) - now)}
            <span>{kind === 'rest' ? 'look-away rest' : 'gentle movement'}</span>
          </div>
        )}
        {session && (
          <p className="session-reminder-caption">
            {r.type === 'eyes' || r.type === 'stretch'
              ? 'Starting exercises pauses your study plan. Resume your session when ready. Snooze or dismiss leaves its timer running.'
              : 'Snooze or dismiss changes this message. Your session timer continues.'}
          </p>
        )}
      </div>
      <div className="reminder-footer">
        <div className="reminder-actions">
          <button className="primary" onClick={() => action('now')}>
            {r.type === 'eyes'
              ? 'Start eye exercises'
              : r.type === 'stretch'
                ? 'Do it now'
                : r.type === 'water'
                  ? 'I drank water'
                  : session
                    ? kind === 'exercise'
                      ? 'Open exercise guide'
                      : kind === 'finished'
                        ? 'Review my session'
                        : 'Open my rest timer'
                    : 'Do it now'}
          </button>
          <button className="secondary" onClick={() => action(`snooze${snooze}`)}>
            <Clock3 size={15} />
            Snooze
          </button>
          <label className="sr-only" htmlFor="snooze">
            Snooze minutes
          </label>
          <select
            id="snooze"
            aria-label="Snooze minutes"
            value={snooze}
            onChange={(e) => setSnooze(Number(e.target.value) as 5 | 10 | 15)}
          >
            {[5, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </div>
        <div className="reminder-links">
          <button onClick={() => action('skip')}>Skip this one</button>
          <button onClick={() => action('off')}>Turn off for today</button>
        </div>
      </div>
    </section>
  );
}
export function NotificationApp() {
  const [data, setData] = useState<Snapshot | null>(null);
  useEffect(
    () =>
      window.screenwell.onMonitor((monitor) =>
        setData((previous) => (previous ? { ...previous, monitor } : previous)),
      ),
    [],
  );
  useEffect(() => {
    void window.screenwell.snapshot().then(setData);
    return window.screenwell.onChange(setData);
  }, []);
  useAppearance(data?.settings ?? defaults, true);
  return (
    <div className="notification-surface">
      {data?.demo && <div className="notification-demo">DEMO · sample reminder</div>}
      {data && <ReminderCard data={data} onUpdate={setData} />}
    </div>
  );
}
