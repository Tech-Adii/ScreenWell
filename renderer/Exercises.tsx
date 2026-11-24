import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Check, Clock3, Pause, Play, Sparkles, X } from 'lucide-react';
import { Snapshot, VisionMetrics } from '../shared/types';
import { Exercise, ExerciseGroup, coachRoutine, exercises } from './exerciseLibrary';
import ExerciseArt from './ExerciseArt';
import { useDialog } from './useDialog';
import { speakOffline } from './speech';
export function RoutinePlayer({
  items,
  data,
  metrics,
  close,
}: {
  items: Exercise[];
  data: Snapshot;
  metrics: VisionMetrics;
  close: () => void;
}) {
  const dialogRef = useDialog();
  const [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(items[0].seconds),
    [paused, setPaused] = useState(false),
    [done, setDone] = useState(false),
    [status, setStatus] = useState('');
  const end = useRef(0);
  const finishing = useRef(false);
  const completed = useRef(0);
  const current = items[index];
  const next = async (log: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      if (log) {
        await window.screenwell.event('exercise-complete', current.seconds, current.id);
        completed.current += current.seconds;
      }
      if (index < items.length - 1) {
        setRemaining(items[index + 1].seconds);
        setIndex(index + 1);
        setPaused(false);
      } else {
        if (completed.current > 0)
          await window.screenwell.event('break-complete', completed.current, 'Guided routine');
        setDone(true);
      }
    } catch {
      setPaused(true);
      setStatus('Couldn’t save this step. You can finish when you’re ready.');
    } finally {
      finishing.current = false;
    }
  };
  useEffect(() => {
    if (paused || done) return;
    end.current = Date.now() + remaining * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((end.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        void next(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [index, paused, done]);
  useEffect(() => {
    if (!data.settings.voice || done || paused) return;
    return speakOffline(`${current.name}. ${current.steps.join(' ')}`, setStatus);
  }, [index, done, paused, data.settings.voice]);
  const cue =
    metrics.present && metrics.posture !== null && ['chin', 'tilt'].includes(current.motion);
  return (
    <div className="modal-backdrop">
      <section
        ref={dialogRef}
        className="routine-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Guided exercise"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      >
        <button autoFocus className="dismiss-reminder" aria-label="Close exercise" onClick={close}>
          <X size={20} />
        </button>
        <p className="eyebrow">
          {done
            ? 'A LITTLE SPACE, WELL SPENT'
            : `STEP ${index + 1} OF ${items.length} · ${current.group.toUpperCase()}`}
        </p>
        <h1>{done ? 'Welcome back.' : current.name}</h1>
        {done ? (
          <div className="routine-done">
            <Check size={50} />
            <p>
              You made a moment for yourself.
              <br />
              Choose one small thing to return to.
            </p>
            <button className="primary" onClick={close}>
              Return to my day
              <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="routine-layout">
            <div className="routine-visual">
              <ExerciseArt motion={current.motion} large />
              <span className="routine-clock">
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </span>
              <p>{current.caption}</p>
            </div>
            <div className="routine-steps">
              <ol>
                {current.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {cue && (
                <p className="form-cue">
                  Optional baseline cue:{' '}
                  {metrics.issues.includes('head tilt')
                    ? 'Gently return your head toward your comfortable starting position.'
                    : 'Your head is close to your calibrated upright position.'}
                </p>
              )}
              <div className="inline-controls">
                <button className="primary" onClick={() => setPaused(!paused)}>
                  {paused ? <Play size={16} /> : <Pause size={16} />}{' '}
                  {paused ? 'Continue' : 'Pause'}
                </button>
                <button className="text-button" onClick={() => void next(false)}>
                  Skip step
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
        <p className="small-print muted" role="status">
          {status}
        </p>
        <p className="exercise-safety">
          {data.study?.status === 'paused' &&
            'Your study plan is paused while you exercise. Resume it from Study session when ready. '}
          Stop if you feel pain. This is general wellness guidance, not medical advice.
        </p>
      </section>
    </div>
  );
}
export default function Exercises({
  data,
  start,
}: {
  data: Snapshot;
  start: (items: Exercise[]) => void;
}) {
  const [group, setGroup] = useState<ExerciseGroup | 'All'>('All'),
    [length, setLength] = useState(2);
  const latest = data.events.filter((e) => e.type === 'vision-alert').at(-1);
  const reason = latest?.detail ?? '';
  const recommended = coachRoutine(reason);
  const items = group === 'All' ? exercises : exercises.filter((e) => e.group === group);
  return (
    <>
      <div className="page-title">
        <p className="eyebrow">A SMALL CHANGE OF PACE</p>
        <h1>Move a little. Reset a little.</h1>
        <p>A few easy movements to make a little room in your day.</p>
      </div>
      <section className="coach-card">
        <div>
          <span className="tag">
            <Sparkles size={14} /> YOUR BREAK COACH
          </span>
          <h2>
            {reason === 'posture'
              ? 'A little ease for your neck & shoulders.'
              : reason === 'eyes'
                ? 'A quiet moment for your eyes.'
                : 'A reset that fits right into your day.'}
          </h2>
          <p>
            {reason
              ? 'Chosen from your recent camera reminder.'
              : 'A balanced routine for shoulders, hands, and a change of position.'}{' '}
            All movements are optional.
          </p>
          <div className="coach-controls">
            <select
              aria-label="Routine duration"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            >
              <option value={2}>2-minute routine</option>
              <option value={3}>3-minute routine</option>
              <option value={5}>5-minute routine</option>
            </select>
            <button
              className="primary"
              onClick={() =>
                start(
                  recommended.map((e) => ({
                    ...e,
                    seconds: Math.floor((length * 60) / recommended.length),
                  })),
                )
              }
            >
              Start my reset
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
        <ExerciseArt motion={recommended[0].motion} />
      </section>
      <div className="exercise-tabs" role="group" aria-label="Exercise category">
        {(['All', 'Neck', 'Shoulders', 'Hands & wrists', 'Eyes', 'Full body'] as const).map((g) => (
          <button
            key={g}
            aria-pressed={group === g}
            className={group === g ? 'selected' : ''}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="exercise-grid">
        {items.map((e) => (
          <button key={e.id} className="exercise-card" onClick={() => start([e])}>
            <div className={`exercise-card-art group-${e.group.split(' ')[0].toLowerCase()}`}>
              <ExerciseArt motion={e.motion} />
            </div>
            <div className="exercise-card-copy">
              <span className="eyebrow">{e.group}</span>
              <h2>{e.name}</h2>
              <p>{e.caption}</p>
              <span className="exercise-meta">
                <Clock3 size={13} />
                {e.seconds} seconds
                <span>
                  <Activity size={14} />
                  Gentle
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="exercise-safety">
        Stop if you feel pain. This is general wellness guidance, not medical advice. Choose seated
        alternatives whenever they feel more comfortable.
      </p>
    </>
  );
}
