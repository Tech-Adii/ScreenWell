import { useState } from 'react';
import {
  ShieldCheck,
  HardDrive,
  CameraOff,
  WifiOff,
  Sparkles,
  MessageSquare,
  Check,
  ArrowRight,
  FlaskConical,
  BookOpen,
} from 'lucide-react';
import { Snapshot } from '../shared/types';
const research = [
  [
    'Control that comes first',
    '73.6% wanted to wait, snooze, or turn reminders off.',
    'Every reminder offers snooze, skip, and off for today.',
  ],
  [
    'Space for important work',
    '70.3% skipped breaks because of focus, workload, or classes.',
    'Important task mode pauses all reminders.',
  ],
  [
    'Camera that stays optional',
    'Average webcam comfort was 2.79 / 5; 39.6% rated it 1–2.',
    'Camera starts off. Timers, water, exercises, and reports work without it.',
  ],
  [
    'The rhythm that fits',
    '34.1% preferred 45–60 minutes; 27.5% preferred 20–30.',
    'A 45-minute default, presets, and custom timing.',
  ],
  [
    'Gentle nudges, real choice',
    '39.6% preferred a pop-up with snooze/dismiss.',
    'A dismissible, non-blocking pop-up is the default.',
  ],
  [
    'Wellness beyond the screen',
    '60.4% reported tired/dry eyes; 47% reported neck/shoulder discomfort.',
    'Eye rests, posture awareness, and optional guided movements.',
  ],
  [
    'Small habits, visible progress',
    '45.1% wanted water reminders; 30.8% wanted daily reports.',
    'Water logging, editable goals, local reports, and gentle milestones.',
  ],
];
export default function Privacy({ data }: { data: Snapshot }) {
  const [tab, setTab] = useState<'privacy' | 'purpose' | 'demo'>('privacy'),
    [feedback, setFeedback] = useState(''),
    [status, setStatus] = useState('');
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">BUILT AROUND PEOPLE. KEPT ON THIS DEVICE.</p>
        <h1>Your privacy. Our purpose.</h1>
        <p>A little clarity about what ScreenWell does, and why.</p>
      </div>
      <div className="exercise-tabs" role="group" aria-label="Privacy and purpose sections">
        {(
          [
            ['privacy', 'Your privacy', ShieldCheck],
            ['purpose', 'Why this feature?', BookOpen],
            ['demo', 'Mentor demo', FlaskConical],
          ] as const
        ).map(([id, title, Icon]) => (
          <button
            key={id}
            className={tab === id ? 'selected' : ''}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={14} />
            {title}
          </button>
        ))}
      </div>
      {tab === 'privacy' ? (
        <>
          <section className="privacy-hero">
            <ShieldCheck size={45} />
            <h2>Just you. Just this device.</h2>
            <p>
              ScreenWell has no account, analytics, telemetry, cloud API, or online content. Your
              wellness space stays on your computer.
            </p>
            <span className="offline-pill">
              <WifiOff size={15} />
              Runtime internet access is blocked
            </span>
          </section>
          <div className="privacy-facts">
            <section className="card">
              <WifiOff size={25} />
              <strong>No outbound loads allowed</strong>
              <p>A session request filter and Content Security Policy block remote resources.</p>
              <small>{data.privacy.blockedRequests} request attempts blocked this session</small>
            </section>
            <section className="card">
              <CameraOff size={25} />
              <strong>0 frames saved</strong>
              <p>
                Camera images and landmarks stay in memory, then are discarded. There is no frame or
                video recording path.
              </p>
              <small>
                Camera is currently{' '}
                {data.privacy.cameraOn ? 'ON · use the top-bar switch to stop' : 'OFF'}
              </small>
            </section>
            <section className="card">
              <HardDrive size={25} />
              <strong>Local storage you control</strong>
              <p>
                Your profile, settings, daily priorities and focus goals, event counts, numerical
                camera summaries, time out of camera view during guided study, calibration, and
                feedback.
              </p>
              <small>
                No encryption claim. Protected by your operating-system account permissions.
              </small>
            </section>
          </div>
          <section className="card space-top">
            <h2>Where your data lives</h2>
            <code className="data-path">
              {data.demo
                ? 'Demo uses an in-memory database. Your real database is untouched.'
                : data.privacy.dataPath}
            </code>
            <p className="muted small-print">
              Export reports from Your progress. Delete your profile, history, calibration, and
              feedback from Profile → Delete all my data. Exported files remain wherever you saved
              them. Closing ScreenWell stops the camera.
            </p>
            <div className="privacy-checks">
              <span>
                <Check size={16} />
                {data.privacy.modelReady
                  ? 'Both models are bundled locally'
                  : 'Camera models are missing; timers still work'}
              </span>
              <span>
                <Check size={16} />
                Fonts, illustrations, animations, and chime are bundled
              </span>
              <span>
                <Check size={16} />
                Camera starts off at every launch
              </span>
            </div>
          </section>
        </>
      ) : tab === 'purpose' ? (
        <>
          <section className="card research-intro">
            <p className="eyebrow">EMPATHISE → DEFINE → IDEATE → PROTOTYPE → TEST</p>
            <h2>Designed from 91 student voices.</h2>
            <p className="muted">
              Applied Design Thinking Lab · CS238DL · SDG 3: Good Health and Well-being.
            </p>
            <blockquote>
              Students need a manageable way to take breaks and return to their tasks, because focus
              and workload compete with pausing, and badly timed reminders feel disruptive.
            </blockquote>
            <small className="muted">
              Survey figures are supplied project research. Discomfort was self-reported. These are
              design inputs, not clinical evidence.
            </small>
          </section>
          <div className="trace-grid">
            {research.map(([title, evidence, feature]) => (
              <section className="card" key={title}>
                <Sparkles size={21} />
                <h2>{title}</h2>
                <p>{evidence}</p>
                <div>
                  <ArrowRight size={15} />
                  {feature}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <section className="card demo-card">
          <FlaskConical size={35} />
          <h2>Tell the story in three minutes.</h2>
          <p>
            Demo mode shows clearly labelled sample activity and shortened reminder timing. It uses
            a separate in-memory database. Your real profile and history return when you leave.
          </p>
          <button className="primary" onClick={() => void window.screenwell.demo(!data.demo)}>
            {data.demo ? 'Leave demo mode' : 'Enter labelled demo mode'}
            <ArrowRight size={17} />
          </button>
          {data.demo && (
            <div className="demo-actions">
              <button
                className="secondary"
                onClick={() => void window.screenwell.demoReminder('break')}
              >
                Preview a break reminder
              </button>
              <button
                className="secondary"
                onClick={() => void window.screenwell.demoReminder('water')}
              >
                Preview a water reminder
              </button>
            </div>
          )}
          <ol>
            <li>Show the dashboard and explain the research.</li>
            <li>Preview a reminder. Snooze it, then show Important task mode.</li>
            <li>Log water, open a short exercise, and show the progress charts.</li>
            <li>Show privacy and export a sample report. Camera use is optional.</li>
          </ol>
        </section>
      )}
      <section className="card feedback-card space-top">
        <MessageSquare size={25} />
        <div>
          <h2>What would make this feel better?</h2>
          <p className="muted">
            A note for your next Prototype and Test cycle. Saved locally. Never sent anywhere.
          </p>
          <label htmlFor="feedback">
            Your feedback
            <textarea
              id="feedback"
              maxLength={2000}
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What helped? What got in the way?"
            />
          </label>
          <button
            className="secondary"
            disabled={!feedback.trim()}
            onClick={() =>
              void window.screenwell
                .feedback(feedback)
                .then(() => {
                  setFeedback('');
                  setStatus('Feedback saved on this computer.');
                })
                .catch(() => setStatus('Couldn’t save your note. Try again.'))
            }
          >
            Save local feedback
            <Check size={15} />
          </button>
          <span className="inline-status" role="status">
            {status}
          </span>
        </div>
      </section>
      <p className="exercise-safety">
        ScreenWell offers general habit support. It is not a medical device and does not diagnose or
        treat any condition.
      </p>
    </>
  );
}
