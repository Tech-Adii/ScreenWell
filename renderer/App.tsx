import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  Coffee,
  Droplets,
  ScanFace,
  Activity,
  ChartNoAxesCombined,
  Monitor,
  ShieldCheck,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Search,
  Wind,
  Play,
  Palette,
  ChevronRight,
  BookOpen,
  Eye,
} from 'lucide-react';
import { Snapshot, Settings as SettingsType } from '../shared/types';

import { Brand } from './components';
import { useAppearance } from './useAppearance';
import { AmbientScene } from './MotionGraphics';
import Profile from './Profile';
import Hydration from './Hydration';
import Camera from './Camera';
import Exercises, { RoutinePlayer } from './Exercises';
import EyeRest from './EyeRest';
import { coachRoutine, Exercise } from './exerciseLibrary';
import Progress from './Progress';
import Desk from './Desk';
import Privacy from './Privacy';
import { messages } from '../shared/i18n/en';
import { useVision } from './useVision';
import { defaults } from '../shared/defaults';
import Breaks, { GuidedBreak } from './Breaks';
import { ReminderCard } from './Reminders';
import { isFocused } from '../engine/scheduler';
import Settings from './Settings';
import Overview from './Overview';
import Breathing from './Breathing';
import CommandMenu, { QuickCommand } from './CommandMenu';
import StudySessionPage from './StudySession';
import { hasStudy, studySettings, studyVisionSelection } from '../shared/study';
import { speakOffline, stopSpeech } from './speech';
import { reminderSpeech } from '../shared/voice';
type Page =
  | 'Study session'
  | 'Overview'
  | 'Breaks & focus'
  | 'Hydration'
  | 'Camera'
  | 'Eye Rest'
  | 'Move & reset'
  | 'Your progress'
  | 'Desk setup'
  | 'Privacy'
  | 'Settings'
  | 'Profile';
const nav = [
  { name: 'Study session', icon: BookOpen },
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Breaks & focus', icon: Coffee },
  { name: 'Hydration', icon: Droplets },
  { name: 'Eye Rest', icon: Eye },
  { name: 'Camera', icon: ScanFace },
  { name: 'Move & reset', icon: Activity },
  { name: 'Your progress', icon: ChartNoAxesCombined },
  { name: 'Desk setup', icon: Monitor },
] as const;
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [page, setPage] = useState<Page>('Study session');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());
  const [guided, setGuided] = useState<{ seconds: number; eye: boolean } | null>(null);
  const [breathing, setBreathing] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [routine, setRoutine] = useState<{ id: string; items: Exercise[] } | null>(null);
  const bootAt = useRef(Date.now());
  const lastAccepted = useRef(0);
  const lastSound = useRef('');
  const studyCameraAttempt = useRef('');
  const studyCameraOwned = useRef(false);
  useEffect(
    () =>
      window.screenwell.onSpeak((text) => {
        if (text === null) stopSpeech();
        else speakOffline(text, setToast);
      }),
    [],
  );
  useEffect(() => {
    if (!data?.settings.voice || !data.engine.pending) {
      stopSpeech();
      return;
    }
    return speakOffline(reminderSpeech(data.engine.pending), setToast);
  }, [data?.engine.pending?.id, data?.settings.voice]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    let last = 0;
    const activity = () => {
      if (Date.now() - last > 2000) {
        last = Date.now();
        window.screenwell.activity();
      }
    };
    document.addEventListener('keydown', activity);
    return () => {
      clearInterval(id);
      document.removeEventListener('keydown', activity);
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const accepted = data.events
      .filter((e) => e.type === 'reminder-accepted' && e.at >= bootAt.current)
      .at(-1);
    if (accepted && accepted.id > lastAccepted.current) {
      lastAccepted.current = accepted.id;
      if (['eyes', 'study-eyes', 'stretch', 'study-stretch'].includes(accepted.detail)) {
        const eyes = accepted.detail.endsWith('eyes');
        setGuided(null);
        setPage(eyes ? 'Eye Rest' : 'Move & reset');
        setRoutine({ id: String(accepted.id), items: coachRoutine(eyes ? 'eyes' : 'stretch') });
      } else if (accepted.detail.startsWith('study-') || hasStudy(data.study))
        setPage('Study session');
      else if (accepted.detail === 'break') {
        setGuided({
          seconds: data.settings.preset === 'pomodoro' ? 300 : 60,
          eye: false,
        });
      } else if (accepted.detail === 'stretch') setPage('Move & reset');
      else if (accepted.detail === 'posture') setPage('Camera');
    }
    if (data.engine.pending && data.engine.pending.id !== lastSound.current) {
      lastSound.current = data.engine.pending.id;
      if (data.settings.sound) void new Audio('screenwell://app/chime.wav').play().catch(() => {});
    }
  }, [data]);
  const startRoutine = async (items: Exercise[]) => {
    try {
      if (data?.study?.status === 'running') {
        setData(await window.screenwell.studyAction({ type: 'pause' }));
      }
      setRoutine({ id: String(Date.now()), items });
    } catch {
      setToast('Could not pause your session. Try starting the exercise again.');
    }
  };
  useEffect(() => {
    void window.screenwell
      .snapshot()
      .then(setData)
      .catch(() =>
        setError('ScreenWell could not load your local data. Reopen the app to try again.'),
      );
    return window.screenwell.onChange(setData);
  }, []);
  useAppearance(data?.settings ?? defaults);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k' &&
        data?.settings.onboarded
      ) {
        if (document.querySelector('[role="dialog"]') && !commandOpen) return;
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [data?.settings.onboarded, commandOpen]);
  const runFocus = async (minutes: number | null) => {
    if (hasStudy(data?.study)) {
      setPage('Study session');
      setToast('Your study session has its own timer. Use its Pause or End controls.');
      return;
    }
    try {
      setData(await window.screenwell.focus(minutes));
      setToast(
        minutes
          ? 'Your focus space is open. All reminders are paused.'
          : 'A little room to return. Reminders resumed.',
      );
    } catch {
      setToast('Couldn’t update focus mode. Please try again.');
    }
  };
  const save = useCallback(async (s: SettingsType) => {
    setData(await window.screenwell.settings(s));
    setToast('All set. Your preferences are saved.');
  }, []);
  useEffect(
    () =>
      window.screenwell.onMonitor((monitor) =>
        setData((previous) => (previous ? { ...previous, monitor } : previous)),
      ),
    [],
  );
  const effectiveSettings = useMemo(
    () => studySettings(data?.settings ?? defaults, data?.study),
    [data?.settings, data?.study],
  );
  const selection = useMemo(() => studyVisionSelection(data?.study), [data?.study]);
  const vision = useVision(effectiveSettings, selection);
  useEffect(() => {
    const session = data?.study;
    if (!hasStudy(session) || !effectiveSettings.cameraConsent) {
      if (studyCameraOwned.current && (vision.on || vision.loading)) vision.stop();
      if (!hasStudy(session)) studyCameraOwned.current = false;
      return;
    }
    const key = `${session.id}:${session.cameraEpoch}`;
    if (studyCameraAttempt.current !== key && !vision.on && !vision.loading) {
      studyCameraAttempt.current = key;
      studyCameraOwned.current = true;
      void vision.start();
    }
  }, [
    data?.study?.id,
    data?.study?.cameraEpoch,
    data?.study?.status,
    data?.study?.cameraAuthorized,
    effectiveSettings.cameraConsent,
    vision.on,
    vision.loading,
  ]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  if (error)
    return (
      <div className="error-screen">
        <h1>Let’s try again.</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Reopen ScreenWell</button>
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <Brand />
        <p>Making a little room for you…</p>
      </div>
    );
  if (!data.settings.onboarded)
    return <Profile settings={data.settings} first save={save} remove={() => {}} />;
  const commands: QuickCommand[] = [
    ...nav.map((item) => ({
      id: item.name,
      title: item.name,
      detail:
        item.name === 'Overview'
          ? 'Your focus, priorities and daily rhythm'
          : item.name === 'Camera'
            ? 'Optional local camera controls'
            : `Open ${item.name.toLowerCase()}`,
      keywords: item.name === 'Overview' ? 'home dashboard priorities plan' : 'navigate page',
      icon: item.icon,
      run: () => setPage(item.name),
    })),
    {
      id: 'focus',
      title: 'Start 25-minute focus',
      detail: 'Make room for your work. All reminders pause.',
      keywords: 'pomodoro concentrate study timer',
      icon: Play,
      run: () => void runFocus(25),
    },
    {
      id: 'resume',
      title: 'Resume reminders',
      detail: 'Finish focus mode and return to your rhythm.',
      keywords: 'stop focus end pause',
      icon: Coffee,
      run: () => void runFocus(null),
    },
    {
      id: 'water',
      title: 'Log a glass of water',
      detail: 'A little sip of care, added to today.',
      keywords: 'drink hydration',
      icon: Droplets,
      run: () => {
        void window.screenwell
          .water()
          .then(setData)
          .then(() => setToast('One glass, a little care. Logged.'))
          .catch(() => setToast('Couldn’t log water. Please try again.'));
      },
    },
    {
      id: 'breathing',
      title: 'Breathing reset',
      detail: 'A quiet minute with a guided breathing circle.',
      keywords: 'breathe relax calm reset wind',
      icon: Wind,
      run: () => setBreathing(true),
    },
    {
      id: 'appearance',
      title: 'Personalise your theme',
      detail: 'Colour stories, custom palettes and motion.',
      keywords: 'settings appearance dark light color colour',
      icon: Palette,
      run: () => setPage('Settings'),
    },
    {
      id: 'privacy',
      title: 'Privacy & purpose',
      detail: 'Your data, your choices, your device.',
      keywords: 'local offline data delete security',
      icon: ShieldCheck,
      run: () => setPage('Privacy'),
    },
    {
      id: 'profile',
      title: 'Edit profile',
      detail: 'Make this space feel more like you.',
      keywords: 'name preferences personal',
      icon: SettingsIcon,
      run: () => setPage('Profile'),
    },
  ];
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">YOUR WELLNESS SPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? 'active' : ''}`}
              onClick={() => setPage(name)}
              aria-current={page === name ? 'page' : undefined}
            >
              <Icon size={20} />
              {messages.navigation[name]}
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Just you. Just this device.</strong>
              <small>Your data stays right here.</small>
            </div>
          </div>
          <button
            className={`nav-item ${page === 'Privacy' ? 'active' : ''}`}
            onClick={() => setPage('Privacy')}
          >
            <ShieldCheck size={19} />
            Privacy & purpose
          </button>
          <button
            className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
            onClick={() => setPage('Settings')}
          >
            <SettingsIcon size={19} />
            Settings
          </button>
          <button className="profile-button" onClick={() => setPage('Profile')}>
            <span className="avatar">{data.settings.name[0]?.toUpperCase()}</span>
            <span>
              <strong>{data.settings.name}</strong>
              <small>A little better, every day</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <AmbientScene />
        <header className="topbar">
          <div className="breadcrumb">
            Your space <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="command-trigger"
              aria-label="Open command menu"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={15} />
              <span>Find your way</span>
              <kbd>{window.screenwell.platform === 'darwin' ? '⌘ K' : 'Ctrl K'}</kbd>
            </button>
            {(vision.on || vision.loading) && (
              <span className="camera-live-header">
                Camera ON{' '}
                <button
                  onClick={() => {
                    if (hasStudy(data.study))
                      void window.screenwell.studyAction({ type: 'camera-off' }).then(setData);
                    else vision.stop();
                  }}
                >
                  Turn off
                </button>
              </span>
            )}
            <span className="offline-pill">
              <i /> Offline & private
            </span>
            <button
              className="icon-button"
              aria-label="Switch theme"
              onClick={() =>
                void save({
                  ...data.settings,
                  theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
                })
              }
            >
              {document.documentElement.dataset.theme === 'dark' ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>
            <button className="avatar" aria-label="Edit profile" onClick={() => setPage('Profile')}>
              {data.settings.name[0]?.toUpperCase()}
            </button>
          </div>
        </header>
        {isFocused(data.engine, now) && (
          <div className="focus-banner">
            <span>Important task mode · all reminders are paused</span>
            <button onClick={() => void window.screenwell.focus(null)}>Resume reminders</button>
          </div>
        )}
        {data.demo && (
          <div className="demo-banner">
            <span>DEMO MODE · sample activity · your real data is untouched</span>
            <button onClick={() => void window.screenwell.demo(false)}>Leave demo mode</button>
          </div>
        )}
        <main id="main" tabIndex={-1} key={page}>
          {hasStudy(data.study) && page !== 'Study session' && (
            <div className="session-active-ribbon">
              <BookOpen size={17} />
              <span>
                Your study plan is {data.study.status === 'paused' ? 'paused' : 'active'}.
              </span>
              <button onClick={() => setPage('Study session')}>
                Open session
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          {data.engine.suggestion && (
            <div className="suggestion-bar">
              <p>Want reminders less often? You’ve skipped a few. We can add 15 minutes.</p>
              <button className="secondary" onClick={() => void window.screenwell.suggest(true)}>
                Give me more space
              </button>
              <button className="text-button" onClick={() => void window.screenwell.suggest(false)}>
                Keep my rhythm
              </button>
            </div>
          )}
          {page === 'Study session' ? (
            <StudySessionPage data={data} now={now} v={vision} />
          ) : page === 'Profile' ? (
            <Profile
              settings={data.settings}
              save={save}
              remove={() => void window.screenwell.deleteData().then(setData)}
            />
          ) : page === 'Settings' ? (
            <Settings settings={data.settings} save={save} />
          ) : page === 'Privacy' ? (
            <Privacy data={data} />
          ) : page === 'Desk setup' ? (
            <Desk metrics={vision.metrics} onCamera={() => setPage('Camera')} />
          ) : page === 'Your progress' ? (
            <Progress data={data} />
          ) : page === 'Move & reset' ? (
            <Exercises data={data} start={(items) => void startRoutine(items)} />
          ) : page === 'Eye Rest' ? (
            <EyeRest start={(items) => void startRoutine(items)} />
          ) : page === 'Camera' ? (
            hasStudy(data.study) ? (
              <StudySessionPage data={data} now={now} v={vision} />
            ) : (
              <Camera data={data} save={save} v={vision} />
            )
          ) : page === 'Hydration' ? (
            <Hydration data={data} save={save} />
          ) : page === 'Breaks & focus' ? (
            <Breaks
              data={data}
              save={save}
              now={now}
              startBreak={(seconds, eye = false) => setGuided({ seconds, eye })}
            />
          ) : page === 'Overview' ? (
            <Overview
              data={data}
              now={now}
              metrics={vision.metrics}
              cameraOn={vision.on}
              navigate={setPage}
              focus={runFocus}
              breathe={() => setBreathing(true)}
              eyeRest={() => {
                setPage('Eye Rest');
                void startRoutine([coachRoutine('eyes')[0]]);
              }}
              notify={setToast}
            />
          ) : null}
        </main>
      </div>
      {commandOpen && <CommandMenu commands={commands} close={() => setCommandOpen(false)} />}
      {breathing && <Breathing close={() => setBreathing(false)} />}
      {routine && (
        <RoutinePlayer
          key={routine.id}
          items={routine.items}
          data={data}
          metrics={vision.metrics}
          close={() => setRoutine(null)}
        />
      )}
      {data.engine.pending && (
        <div className={`reminder-overlay ${data.settings.style === 'fullscreen' ? 'large' : ''}`}>
          <ReminderCard data={data} onUpdate={setData} />
        </div>
      )}
      {guided && (
        <GuidedBreak
          seconds={guided.seconds}
          eye={guided.eye}
          onClose={() => setGuided(null)}
          onComplete={async () => {
            setData(
              await window.screenwell.event(
                'break-complete',
                guided.seconds,
                guided.eye ? 'Eye rest' : 'Mindful break',
              ),
            );
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
