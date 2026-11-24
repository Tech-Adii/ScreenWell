import { useEffect, useRef, useState, CSSProperties } from 'react';
import { X, Wind, Play, Pause, RotateCcw, Check, ArrowRight } from 'lucide-react';
import { breathingFrame, formatCountdown } from '../shared/wellness';
import { useDialog } from './useDialog';
export default function Breathing({ close }: { close: () => void }) {
  const dialog = useDialog();
  const [duration, setDuration] = useState(60),
    [elapsed, setElapsed] = useState(0),
    [running, setRunning] = useState(false),
    [started, setStarted] = useState(false),
    [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const base = useRef(0),
    start = useRef(0),
    recorded = useRef(false);
  const frame = breathingFrame(elapsed, duration),
    done = frame.done;
  const record = async () => {
    if (recorded.current) return;
    recorded.current = true;
    setSaveState('saving');
    try {
      await window.screenwell.event('breathing-complete', duration, 'Guided breathing');
      setSaveState('saved');
    } catch {
      recorded.current = false;
      setSaveState('error');
    }
  };
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const current = Math.min(duration, base.current + (Date.now() - start.current) / 1000);
      setElapsed(current);
      if (current >= duration) setRunning(false);
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [running, duration]);
  useEffect(() => {
    if (done) void record();
  }, [done]);
  const toggle = () => {
    if (running) {
      base.current = Math.min(duration, base.current + (Date.now() - start.current) / 1000);
      setElapsed(base.current);
      setRunning(false);
    } else {
      start.current = Date.now();
      setStarted(true);
      setRunning(true);
    }
  };
  const reset = () => {
    base.current = 0;
    start.current = 0;
    recorded.current = false;
    setElapsed(0);
    setRunning(false);
    setStarted(false);
    setSaveState('idle');
  };
  const phase = elapsed % 10,
    scale = phase < 4 ? 0.8 + (0.2 * phase) / 4 : 1 - (0.2 * (phase - 4)) / 6;
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="breathing-dialog"
        role="dialog"
        aria-label="Breathing reset"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      >
        <button
          className="breathing-close icon-button"
          onClick={close}
          aria-label="Close breathing reset"
        >
          <X size={19} />
        </button>
        <span className="breathing-mark">
          <Wind size={24} />
        </span>
        <p className="eyebrow">A MOMENT THAT BELONGS TO YOU</p>
        <h1>{done ? 'A little more room.' : 'Come back to your breath.'}</h1>
        <p className="breathing-intro">
          Let your shoulders settle. Follow at a comfortable pace,
          <br />
          or simply take a quiet moment.
        </p>
        <div className="breath-visual" data-running={running}>
          <span className="breath-halo halo-outer" />
          <span className="breath-halo halo-inner" />
          <div
            className="breath-disc"
            style={{ '--breath-scale': running || started ? scale : 0.85 } as CSSProperties}
          >
            {done ? (
              <Check size={40} />
            ) : (
              <>
                <Wind size={24} />
                <strong>
                  {!started ? 'Make a little space' : running ? frame.phase : 'Take your time'}
                </strong>
                <span>
                  {!started
                    ? 'Ready when you are'
                    : running
                      ? `${frame.phaseSeconds} seconds`
                      : 'Paused'}
                </span>
              </>
            )}
          </div>
          <span className="breath-orbit-dot" />
        </div>
        <div className="breathing-time">
          <strong>{formatCountdown(frame.remaining * 1000)}</strong>
          <span>
            {done ? 'A moment, well spent.' : `${frame.cycles} / ${duration / 10} breaths`}
          </span>
        </div>
        {!started && (
          <div className="breathing-duration" role="group" aria-label="Breathing duration">
            {[60, 120].map((seconds) => (
              <button
                key={seconds}
                aria-pressed={duration === seconds}
                onClick={() => setDuration(seconds)}
              >
                {seconds / 60} minute{seconds === 120 ? 's' : ''}
              </button>
            ))}
          </div>
        )}
        <div className="breathing-controls">
          {done ? (
            <button className="primary" onClick={close}>
              Back to your day
              <ArrowRight size={17} />
            </button>
          ) : (
            <button className="primary" onClick={toggle}>
              {running ? <Pause size={16} /> : <Play size={16} />}{' '}
              {running ? 'Pause' : started ? 'Continue breathing' : 'Begin breathing'}
            </button>
          )}
          {started && !running && saveState !== 'saving' && (
            <button className="secondary" onClick={reset}>
              <RotateCcw size={15} />
              Start fresh
            </button>
          )}
        </div>
        {saveState === 'error' ? (
          <button className="text-button" onClick={() => void record()}>
            Couldn’t save this moment. Try again.
          </button>
        ) : (
          <p className="breathing-caption" role="status">
            {saveState === 'saved'
              ? 'Your breathing moment is saved on this device.'
              : done
                ? 'Saving your moment…'
                : 'A slow inhale. A longer exhale. No breath holding.'}
          </p>
        )}
      </section>
    </div>
  );
}
