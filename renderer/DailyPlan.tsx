import { useState } from 'react';
import { Check, Plus, ArrowUpRight, Trash2, ListChecks, Target } from 'lucide-react';
import { DailyPlan as Plan, PlanAction } from '../shared/types';
export default function DailyPlan({
  plan,
  completedMinutes,
  startFocus,
}: {
  plan: Plan;
  completedMinutes: number;
  startFocus: () => void;
}) {
  const [title, setTitle] = useState(''),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('');
  const mutate = async (action: PlanAction) => {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await window.screenwell.plan(action);
      if (action.type === 'add') setTitle((current) => (current === action.title ? '' : current));
      setStatus(
        action.type === 'add'
          ? 'A little direction for your day. Saved.'
          : action.type === 'goal'
            ? 'Your focus goal is saved.'
            : 'Your priorities are saved.',
      );
    } catch {
      setStatus('Couldn’t save this change. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const complete = plan.tasks.filter((task) => task.done).length;
  return (
    <section className="card priority-card" aria-label="Daily priorities">
      <div className="premium-card-heading">
        <div>
          <span className="section-kicker">
            <ListChecks size={13} />A LITTLE DIRECTION
          </span>
          <h2>Make room for what matters.</h2>
        </div>
        <span className="task-count">
          {complete}
          <span> / {plan.tasks.length}</span>
        </span>
      </div>
      <p className="priority-description">A few priorities. A calmer kind of productive.</p>
      <div className="priority-tasks">
        {plan.tasks.length ? (
          plan.tasks.map((task) => (
            <div className={`priority-row ${task.done ? 'completed' : ''}`} key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={busy}
                  aria-label={`Complete ${task.title}`}
                  onChange={() => void mutate({ type: 'toggle', id: task.id })}
                />
                <span className="priority-checkbox" aria-hidden="true">
                  {task.done && <Check size={13} />}
                </span>
                <span>{task.title}</span>
              </label>
              <button
                className="icon-button priority-remove"
                disabled={busy}
                aria-label={`Remove ${task.title}`}
                onClick={() => void mutate({ type: 'remove', id: task.id })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="priority-empty">
            <span>
              <ListChecks size={23} />
            </span>
            <div>
              <strong>Start with one small thing.</strong>
              <p>A chapter to read. A problem to solve. Your pace.</p>
            </div>
          </div>
        )}
      </div>
      <form
        className="priority-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) void mutate({ type: 'add', title });
        }}
      >
        <Plus size={16} />
        <input
          aria-label="New priority"
          value={title}
          maxLength={120}
          placeholder={
            plan.tasks.length >= 5
              ? 'Your day has a little direction.'
              : 'What deserves your attention today?'
          }
          disabled={busy || plan.tasks.length >= 5}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          disabled={busy || !title.trim() || plan.tasks.length >= 5}
          aria-label="Add priority"
        >
          <ArrowUpRight size={17} />
        </button>
      </form>
      <div className="priority-footer">
        <span>Up to five. You can always change your mind.</span>
        <button className="text-button" onClick={startFocus}>
          Make some focus time
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="focus-goal">
        <div>
          <Target size={16} />
          <label htmlFor="focus-goal">Today’s focus goal</label>
          <select
            id="focus-goal"
            aria-label="Daily focus goal"
            disabled={busy}
            value={plan.focusGoal}
            onChange={(e) => void mutate({ type: 'goal', minutes: Number(e.target.value) })}
          >
            {Array.from(new Set([30, 60, 90, 120, 180, 240, plan.focusGoal]))
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
          </select>
        </div>
        <div
          className="focus-goal-track"
          role="progressbar"
          aria-label="Completed focus minutes"
          aria-valuenow={Math.min(plan.focusGoal, completedMinutes)}
          aria-valuemin={0}
          aria-valuemax={plan.focusGoal}
        >
          <i style={{ width: `${Math.min(100, (completedMinutes / plan.focusGoal) * 100)}%` }} />
        </div>
        <small>
          {Math.round(completedMinutes)} of {plan.focusGoal} minutes from completed sessions. Every
          minute counts.
        </small>
      </div>
      <p className="priority-status" role="status">
        {status}
      </p>
    </section>
  );
}
